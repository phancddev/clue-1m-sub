import type { APIRoute } from 'astro';
import { renderFn } from '../../lib/globals';

export const POST: APIRoute = async ({ url }) => {
  if (url.searchParams.has('dry')) return Response.json({ ok: false }, { status: 400 });
  if (url.searchParams.get('action') === 'stop') {
    const stop = (globalThis as unknown as Record<symbol, (() => void)>)[Symbol.for('clue1m.stopRecording')];
    stop?.();
    return Response.json({ ok: true });
  }
  const start = renderFn();
  if (!start) return Response.json({ ok: false }, { status: 503 });
  void start({ manual: true });
  return Response.json({ ok: true }, { status: 202 });
};
