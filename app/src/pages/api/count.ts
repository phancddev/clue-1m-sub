import type { APIRoute } from 'astro';
import { appState } from '../../lib/globals';

export const GET: APIRoute = async () => {
  const s = appState();
  return new Response(
    JSON.stringify({
      maxId: s.maxId,
      count: s.count,
      last24h: s.last24h,
      phase: s.phase,
      target: 1_000_000,
      video: s.video.status,
      updatedAt: s.updatedAt,
    }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
  );
};
