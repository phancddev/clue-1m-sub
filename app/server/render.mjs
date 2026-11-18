import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { state, save, dataDir } from './state.mjs';
import { buildSchedule, TARGET, ARM_AT, FINALE } from './timeline.mjs';
import { fetchTail } from './timeline.db.mjs';
import { synthAudio } from './audio.mjs';

const execFileP = promisify(execFile);
const RUNNING = Symbol.for('clue1m.renderRunning');
const outDir = path.join(dataDir, 'videos');

/**
 * Hai chế độ quay:
 * - LIVE (mặc định từ 999.991, hoặc tay): chromium mở trang capture, đẩy số sub
 *   theo poll vào page; khi đạt 1.000.000 chạy finale rồi dừng. Audio tick ghi
 *   từ thời điểm thật của từng sub -> khớp hình tuyệt đối.
 * - POST-HOC (self-heal khi app vào sau khi 1M đã qua): dựng timeline đầy đủ
 *   từ DB và quay như bản cũ.
 */
async function doRender({ manual = false } = {}) {
  if (globalThis[RUNNING]) return { ok: false };
  const session = { stop: false };
  globalThis[RUNNING] = session;
  const initial = state.maxId;
  const startedBelow = initial > 0 && initial < TARGET;
  if (manual) state.manualRecording = true;
  state.video = { status: 'rendering', startedAt: Date.now() };
  save();

  let browser;
  const base = 'million';
  let wavPath = null;
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.mkdirSync(path.join(outDir, 'raw'), { recursive: true });

    const { chromium } = await import('playwright');
    const port = process.env.PORT || '4321';
    browser = await chromium.launch({
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
    const replayUrl = `http://127.0.0.1:${port}/replay?lang=${process.env.RENDER_LANG || 'vi'}&t=${encodeURIComponent(process.env.ACCESS_TOKEN || '')}`;

    let durationMs;
    let audioSched = null;
    let final = false;

    if (!manual && !startedBelow) {
      // ---- Self-heal: 1M đã qua từ trước -> quay lại toàn bộ từ DB ----
      const rows = await fetchTail(TARGET - 1100);
      if (!rows.length) throw new Error('no submission rows fetched from db');
      const sched = buildSchedule(rows, { target: TARGET });
      await page.addInitScript((r) => { window.__REPLAY = r; }, sched);
      await page.goto(replayUrl, { waitUntil: 'networkidle' });
      await page.waitForFunction('window.__replayDone === true', null, {
        timeout: sched.totalMs + 45_000,
        polling: 500,
      });
      await page.waitForTimeout(1200); // giữ frame cuối
      durationMs = sched.totalMs + 1200;
      audioSched = sched;
      final = true;
    } else {
      // ---- LIVE capture: quay bộ đếm thật, chờ 1M để chạy finale ----
      const started = Date.now();
      const capture = async () => {
        await page.goto(replayUrl + '&capture=1');
        await page.waitForFunction('typeof window.setCaptureCount === "function"');
      };
      await capture();
      let below = startedBelow;
      let celebrated = false;
      let celebratedAt = null;
      let lastCount = initial;
      const ticks = [];

      while (!session.stop) {
        const count = state.maxId;
        if (count > 0 && count < TARGET) below = true;
        if (count > lastCount) {
          const t = Date.now() - started;
          // tách tick cách nhau ~45ms khi 1 lần poll nhảy nhiều sub
          for (let v = lastCount + 1; v <= count; v++) {
            ticks.push({ t: Math.max(0, t - (count - v) * 45), v, w: v >= TARGET ? 3 : 2 });
          }
          lastCount = count;
        }
        await page.evaluate((n) => window.setCaptureCount(n), count);
        if (!celebrated && count >= TARGET && (below || !manual || initial >= TARGET)) {
          celebrated = true;
          final = true;
          celebratedAt = Date.now() - started;
          const rows = await fetchTail(ARM_AT);
          const sched = buildSchedule(rows, { target: TARGET });
          sched.timings.intro = sched.timings.finaleStart = 0;
          sched.events = [{ t: 0, v: TARGET, w: 3 }];
          sched.totalMs = sched.timings.finaleMs;
          await page.addInitScript((r) => { window.__REPLAY = r; }, sched);
          await page.goto(replayUrl);
          const end = Date.now() + sched.totalMs;
          while (!session.stop && Date.now() < end) await page.waitForTimeout(200);
          if (!manual || session.stop) break;
          await capture();
        }
        await page.waitForTimeout(250);
      }
      durationMs = Date.now() - started;

      // Audio từ tick thật + fanfare đúng lúc chạm mốc (nếu có)
      audioSched = {
        target: TARGET,
        dry: false,
        totalMs: durationMs,
        events: ticks,
        timings: {
          intro: 0,
          finaleStart: celebrated ? celebratedAt : durationMs,
          finaleMs: celebrated ? FINALE : 0,
        },
        meta: { millionth: null, startV: initial, generatedAt: new Date().toISOString() },
      };
    }

    state.video.stopping = true; // UI hiện "Đang lưu video…"
    save();
    const video = page.video();
    await ctx.close(); // finalize webm vào outDir/raw
    const webmPath = await video.path();
    await browser.close();
    browser = undefined;

    // ---- Mux mp4 (audio chỉ thêm khi có event) ----
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const webmFinal = path.join(outDir, `${base}-${stamp}.webm`);
    const mp4Path = path.join(outDir, `${base}-${stamp}.mp4`);
    fs.renameSync(webmPath, webmFinal);

    const args = ['-y', '-i', webmFinal];
    if (audioSched && audioSched.events.length) {
      wavPath = path.join(outDir, `${base}-audio.wav`);
      await synthAudio(audioSched, wavPath);
      args.push('-i', wavPath);
    }
    args.push(
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart',
      '-t', String(durationMs / 1000),
      mp4Path
    );
    await execFileP('ffmpeg', args);

    state.video = {
      status: 'done',
      final, // true khi video chứa finale 1M; dừng sớm -> poller được phép quay lại
      mp4: path.basename(mp4Path),
      webm: path.basename(webmFinal),
      durationMs,
      finishedAt: Date.now(),
    };
    console.log('[render] done:', state.video.mp4, 'final:', final);
  } catch (e) {
    state.video = { status: 'failed', error: String(e?.stack || e), finishedAt: Date.now() };
    console.error('[render] failed', e);
  } finally {
    await browser?.close().catch(() => {});
    if (wavPath) fs.rmSync(wavPath, { force: true });
    globalThis[RUNNING] = false;
    state.manualRecording = false; // mở lại đường cho auto-trigger sau phiên tay
    save();
  }
  return { ok: state.video.status === 'done' };
}

// Đăng ký global để endpoint API và poller (có thể từ 2 bản bundle khác nhau) dùng chung
globalThis[Symbol.for('clue1m.triggerRender')] = doRender;

export { doRender as triggerRender };

globalThis[Symbol.for('clue1m.stopRecording')] = () => {
  const session = globalThis[RUNNING];
  if (session) {
    session.stop = true;
    state.video.stopping = true;
    save();
  }
};
