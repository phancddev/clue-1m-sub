import fs from 'node:fs';
import path from 'node:path';

// Singleton toàn cục: cùng 1 state dùng chung giữa server.mjs và các endpoint
// (vite có thể bundle bản copy riêng của module này → phải neo vào globalThis)
const KEY = Symbol.for('clue1m.state');
const DATA_DIR = process.env.DATA_DIR || path.resolve('data');

function defaults() {
  return {
    phase: 'idle', // idle | armed | done
    maxId: 0,
    count: 0,
    last24h: 0,
    updatedAt: 0,
    lastStatsAt: 0,
    startedAt: 0,
    lastError: '',
    video: { status: 'none' }, // none | rendering | done | failed
  };
}

const g = globalThis;
if (!g[KEY]) {
  let st = defaults();
  try {
    st = { ...defaults(), ...JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'state.json'), 'utf8')) };
  } catch {
    /* lần chạy đầu */
  }
  if (st.video.status === 'rendering') st.video = { status: 'none' };
  g[KEY] = st;
}

export const state = g[KEY];

export function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = path.join(DATA_DIR, 'state.json.tmp');
    fs.writeFileSync(tmp, JSON.stringify(state));
    fs.renameSync(tmp, path.join(DATA_DIR, 'state.json'));
  } catch (e) {
    console.error('[state] save failed', e);
  }
}

export const dataDir = DATA_DIR;
