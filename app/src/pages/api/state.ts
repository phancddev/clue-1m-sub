import type { APIRoute } from 'astro';
import { appState } from '../../lib/globals';

export const GET: APIRoute = async () => {
  const s = appState();
  return new Response(
    JSON.stringify({
      phase: s.phase,
      maxId: s.maxId,
      count: s.count,
      video: s.video,
    }),
    { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
  );
};
