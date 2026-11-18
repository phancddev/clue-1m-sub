process.env.PORT ??= '4321';
process.env.HOST ??= '0.0.0.0';

// Poller + render đăng ký global chạy trong cùng tiến trình với HTTP server
// (adapter standalone tự listen PORT và tự serve static client assets).
const { startPoller } = await import('./server/poller.mjs');
startPoller();
await import('./server/render.mjs');

await import('./dist/server/entry.mjs');
