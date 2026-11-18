// Accessor typed cho các singleton đăng ký qua globalThis (Symbol.for) bởi
// server/*.mjs. Vite bundle module .mjs riêng nên không import trực tiếp được
// dạng typed — registry là in-process, shape biết trước như dưới đây.

export interface VideoInfo {
  status: 'none' | 'rendering' | 'done' | 'failed';
  dry?: boolean;
  mp4?: string;
  webm?: string;
  durationMs?: number;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
}

export interface AppState {
  phase: 'idle' | 'armed' | 'done';
  maxId: number;
  count: number;
  last24h: number;
  updatedAt: number;
  lastStatsAt: number;
  startedAt: number;
  lastError: string;
  video: VideoInfo;
}

export type RenderFn = (opts: { manual: boolean }) => Promise<{ ok: boolean }>;

const STATE_KEY = Symbol.for('clue1m.state');
const RENDER_KEY = Symbol.for('clue1m.triggerRender');

// globalThis không index được bằng symbol trong TS -> cast 1 lần có lý do
const g = globalThis as unknown as Record<symbol, unknown>;

export function appState(): AppState {
  const raw = g[STATE_KEY];
  if (!raw || typeof raw !== 'object') {
    return {
      phase: 'idle',
      maxId: 0,
      count: 0,
      last24h: 0,
      updatedAt: 0,
      lastStatsAt: 0,
      startedAt: 0,
      lastError: '',
      video: { status: 'none' },
    };
  }
  return raw as unknown as AppState; // shape do server/state.mjs đảm bảo
}

export function renderFn(): RenderFn | null {
  const raw = g[RENDER_KEY];
  return typeof raw === 'function' ? (raw as unknown as RenderFn) : null;
}

/** Lấy tên file video an toàn theo loại, chỉ khi render xong và có tên hợp lệ. */
export function videoFileName(v: VideoInfo, kind: 'mp4' | 'webm'): string | null {
  if (v.status !== 'done') return null;
  const name = kind === 'mp4' ? v.mp4 : v.webm;
  if (typeof name !== 'string' || !/^[A-Za-z0-9._-]+$/.test(name)) return null;
  return name;
}
