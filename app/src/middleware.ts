import { defineMiddleware } from 'astro:middleware';
import { timingSafeEqual } from 'node:crypto';

// Private theo token: mọi page + API đều phải có ?t= (hoặc cookie set sau lần
// đầu). Static asset /_astro/* cho phép tự do (chỉ là JS/CSS không mật).
const PUBLIC_PREFIXES = ['/_astro/', '/favicon'];

function ok(token: string) {
  const want = Buffer.from(process.env.ACCESS_TOKEN || '');
  const got = Buffer.from(token || '');
  return want.length === got.length && timingSafeEqual(want, got);
}

export const onRequest = defineMiddleware((ctx, next) => {
  const p = ctx.url.pathname;
  if (PUBLIC_PREFIXES.some((x) => p.startsWith(x))) return next();

  const tok =
    ctx.url.searchParams.get('t') ||
    ctx.request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    ctx.cookies.get('t')?.value ||
    '';

  if (!ok(tok)) return new Response('Not Found', { status: 404 });

  ctx.cookies.set('t', tok, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });
  return next();
});
