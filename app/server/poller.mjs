import { one } from './db.mjs';
import { state, save } from './state.mjs';
import { TARGET, ARM_AT } from './timeline.mjs';

const K = Symbol.for('clue1m.poller');

function triggerRender() {
  // render.mjs đăng ký vào globalThis để tránh 2 bản copy module (vite + node)
  const fn = globalThis[Symbol.for('clue1m.triggerRender')];
  if (fn) return fn;
  console.error('[poller] render module not registered yet');
  return null;
}

async function tick() {
  const r = await one('SELECT MAX(id) AS m FROM judge_submission'); // O(1) trên PK
  const maxId = Number(r?.m || 0);
  state.maxId = maxId;
  state.updatedAt = Date.now();

  if (state.phase === 'idle' && maxId >= ARM_AT) {
    state.phase = 'armed';
    console.log('[poller] ARMED at maxId =', maxId);
  }

  // COUNT(*) + rate mỗi 60s: query ~30ms, không đáng kể
  if (!state.lastStatsAt || Date.now() - state.lastStatsAt > 60_000) {
    try {
      const c = await one('SELECT COUNT(*) AS c FROM judge_submission');
      state.count = Number(c?.c || 0);
      const h = await one(
        'SELECT COUNT(*) AS c FROM judge_submission WHERE date >= NOW() - INTERVAL 1 DAY'
      );
      state.last24h = Number(h?.c || 0);
      state.lastStatsAt = Date.now();
    } catch (e) {
      state.lastError = String(e?.message || e);
    }
  }

  if (maxId >= TARGET) {
    if (state.phase !== 'done') {
      state.phase = 'done';
      console.log('[poller] DONE — 1,000,000 reached at maxId =', maxId);
    }
  }
  if (maxId >= ARM_AT && !state.manualRecording) {
    // Chỉ video có finale 1M (final === true) mới tính "đã có"; dừng sớm/fail
    // thì quay lại (backoff 10 phút chống churn).
    const v = state.video;
    const hasRealVideo = v.status === 'done' && v.final === true;
    const backoff = v.status === 'failed' && v.finishedAt && Date.now() - v.finishedAt < 600_000;
    if (!hasRealVideo && v.status !== 'rendering' && !backoff) {
      const fn = triggerRender();
      if (fn) fn({}).catch((e) => console.error('[poller] render failed', e));
    }
  }

  save();
}

export function startPoller() {
  if (globalThis[K]) return;
  globalThis[K] = true;
  state.startedAt ||= Date.now();
  console.log('[poller] started, phase =', state.phase);
  const loop = async () => {
    try {
      await tick();
    } catch (e) {
      state.lastError = String(e?.message || e);
      save();
    }
    // IDLE 15s | ARMED 1s | DONE 5s (giữ số tươi cho trang live)
    const iv = state.video.status === 'rendering' ? 1_000 : state.phase === 'armed' ? 1_000 : state.phase === 'done' ? 5_000 : state.maxId >= ARM_AT - 100 ? 1_000 : 15_000;
    globalThis[K] = setTimeout(loop, iv);
  };
  loop();
}
