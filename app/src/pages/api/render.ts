import type { APIRoute } from 'astro';
import { renderFn } from '../../lib/globals';

export const POST: APIRoute = async ({ url }) => {
  const dry = url.searchParams.get('dry') === '1';
  const fn = renderFn();
  if (!fn) {
    return new Response(JSON.stringify({ ok: false, error: 'render not loaded' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Chạy nền; trang /video theo dõi qua /api/state
  fn({ dry }).catch((e: unknown) => console.error('[api/render]', e));
  return new Response(JSON.stringify({ ok: true, started: true, dry }), {
    headers: { 'content-type': 'application/json' },
  });
};
