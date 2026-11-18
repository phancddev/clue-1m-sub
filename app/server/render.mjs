import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { state, save, dataDir } from './state.mjs';
import { buildSchedule, TARGET } from './timeline.mjs';
import { fetchTail } from './timeline.db.mjs';
import { synthAudio } from './audio.mjs';

const execFileP = promisify(execFile);
const RUNNING = Symbol.for('clue1m.renderRunning');
const outDir = path.join(dataDir, 'videos');

/**
 * Render video: quay trang /replay bằng Playwright (webm) -> ghép audio WAV tự
 * tổng hợp -> mp4 h264. Chạy đúng 1 lần khi chạm mốc; cpus: 2 trong compose.
 */
async function doRender({ dry = false } = {}) {
  if (globalThis[RUNNING]) return { ok: false, error: 'render already running' };
  globalThis[RUNNING] = true;
  state.video = { status: 'rendering', dry, startedAt: Date.now() };
  save();

  const base = dry ? 'dryrun' : 'million';
  try {
    const target = dry ? Math.max(state.maxId, TARGET - 1100) : TARGET;
    const rows = await fetchTail(target - 1100);
    if (!rows.length) throw new Error('no submission rows fetched from db');
    const sched = buildSchedule(rows, { target, dry });

    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(path.join(outDir, 'raw'), { recursive: true });
    fs.writeFileSync(path.join(outDir, 'schedule-last.json'), JSON.stringify(sched));

    // ---- 1) Quay video webm qua Playwright ----
    const { chromium } = await import('playwright');
    const port = process.env.PORT || '4321';
    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-dev-shm-usage', '--force-device-scale-factor=1'],
    });
    const ctx = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      recordVideo: { dir: path.join(outDir, 'raw'), size: { width: 1920, height: 1080 } },
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.error('[render] pageerror', e));
    await page.addInitScript((replay) => {
      window.__REPLAY = replay;
    }, sched);
    await page.goto(
      `http://127.0.0.1:${port}/replay?lang=${process.env.RENDER_LANG || 'vi'}&t=${encodeURIComponent(process.env.ACCESS_TOKEN || '')}`,
      { waitUntil: 'networkidle' }
    );
    await page.waitForFunction('window.__replayDone === true', null, {
      timeout: sched.totalMs + 45_000,
      polling: 500,
    });
    await page.waitForTimeout(1200); // giữ frame cuối để ghi trọn đuôi finale
    await ctx.close(); // finalize webm vào outDir/raw
    await browser.close();

    // API page.video khác nhau giữa các version playwright -> quét file mới nhất
    const rawDir = path.join(outDir, 'raw');
    const cands = fs
      .readdirSync(rawDir)
      .filter((f) => f.endsWith('.webm'))
      .map((f) => ({ f, m: fs.statSync(path.join(rawDir, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    const webmPath = cands.length ? path.join(rawDir, cands[0].f) : null;
    if (!webmPath || !fs.existsSync(webmPath)) throw new Error('recorded webm not found');

    // ---- 2) Audio từ cùng schedule -> sync tuyệt đối ----
    const wavPath = path.join(outDir, `${base}-audio.wav`);
    await synthAudio(sched, wavPath);

    // ---- 3) Mux thành mp4 ----
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const webmFinal = path.join(outDir, `${base}-${stamp}.webm`);
    const mp4Path = path.join(outDir, `${base}-${stamp}.mp4`);
    fs.copyFileSync(webmPath, webmFinal);
    await execFileP('ffmpeg', [
      '-y', '-i', webmPath, '-i', wavPath,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest',
      mp4Path,
    ]);
    fs.rmSync(wavPath, { force: true });

    state.video = {
      status: 'done',
      dry,
      mp4: path.basename(mp4Path),
      webm: path.basename(webmFinal),
      durationMs: sched.totalMs,
      finishedAt: Date.now(),
    };
    console.log('[render] done:', state.video.mp4);
  } catch (e) {
    state.video = { status: 'failed', dry, error: String(e?.stack || e), finishedAt: Date.now() };
    console.error('[render] failed', e);
  } finally {
    globalThis[RUNNING] = false;
    save();
  }
  return { ok: state.video.status === 'done' };
}

// Đăng ký global để endpoint API và poller (có thể từ 2 bản bundle khác nhau) dùng chung
globalThis[Symbol.for('clue1m.triggerRender')] = doRender;

export { doRender as triggerRender };
