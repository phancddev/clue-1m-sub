// Confetti canvas tự chứa (không lib, không tài nguyên ngoài).
// Finale: 2 pháo hàng góc dưới + mưa giấy liên tục + ruy bưng lắc lư + burst giữa màn.
export function startConfetti(canvas: HTMLCanvasElement, durationMs = 8000): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;
  const W = (canvas.width = canvas.clientWidth || 1920);
  const H = (canvas.height = canvas.clientHeight || 1080);

  const COLORS = ['#3c9eff', '#fb8b3e', '#a5d6ff', '#ffd700', '#ffe08a', '#ffffff', '#9aa7ff'];
  type Shape = 'rect' | 'ribbon' | 'dot';

  interface P {
    x: number; y: number; vx: number; vy: number;
    rot: number; vr: number; w: number; h: number; c: string; shape: Shape;
    g: number; drag: number; sway: number; flut: number; phase: number;
    born: number; ttl: number;
  }

  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const parts: P[] = [];

  function push(x: number, y: number, vx: number, vy: number, now: number): void {
    const shape: Shape = Math.random() < 0.22 ? 'ribbon' : Math.random() < 0.3 ? 'dot' : 'rect';
    parts.push({
      x, y, vx, vy,
      rot: rnd(0, Math.PI * 2),
      vr: rnd(-0.2, 0.2),
      w: shape === 'dot' ? rnd(4, 7) : rnd(7, 13),
      h: shape === 'ribbon' ? rnd(22, 36) : shape === 'dot' ? rnd(4, 7) : rnd(8, 14),
      c: COLORS[(Math.random() * COLORS.length) | 0],
      shape,
      g: shape === 'ribbon' ? rnd(0.07, 0.1) : rnd(0.11, 0.2),
      drag: rnd(0.986, 0.996),
      sway: rnd(0.3, 1.4),
      flut: rnd(0.004, 0.009),
      phase: rnd(0, Math.PI * 2),
      born: now,
      ttl: rnd(3800, 6800),
    });
  }

  function cannon(x: number, y: number, dir: number, n: number, now: number): void {
    for (let i = 0; i < n; i++) {
      const ang = dir + rnd(-0.35, 0.35);
      const sp = rnd(12, 23);
      push(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, now);
    }
  }

  function rain(n: number, now: number): void {
    for (let i = 0; i < n; i++) {
      push(rnd(-20, W + 20), rnd(-160, -12), rnd(-0.7, 0.7), rnd(2, 4.6), now);
    }
  }

  function burst(x: number, y: number, n: number, now: number): void {
    for (let i = 0; i < n; i++) {
      const ang = rnd(0, Math.PI * 2);
      const sp = rnd(3.5, 9);
      push(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp - 2, now);
    }
  }

  const t0 = performance.now();
  cannon(70, H - 30, -Math.PI / 2 + 0.5, 120, 0);
  cannon(W - 70, H - 30, -Math.PI / 2 - 0.5, 120, 0);
  rain(80, 0);

  let b1 = false;
  let b2 = false;
  let raf = 0;
  let last = t0;

  const frame = (now: number) => {
    const el = now - t0;
    // dt chuẩn hoá theo 60fps để tốc độ ổn định khi rAF giật
    const dt = Math.max(0.2, Math.min(2.6, (now - last) / (1000 / 60)));
    last = now;

    if (el < durationMs * 0.6 && parts.length < 860) rain(3, el);
    if (!b1 && el > 1300) { b1 = true; burst(W * 0.28, H * 0.3, 70, el); }
    if (!b2 && el > 3100) { b2 = true; burst(W * 0.72, H * 0.26, 70, el); }

    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      p.vx *= Math.pow(p.drag, dt);
      p.vy = p.vy * Math.pow(p.drag, dt) + p.g * dt;
      p.x += p.vx * dt + Math.sin(el * 0.003 + p.phase) * p.sway * 0.6 * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      const life = (el - p.born) / p.ttl;
      const alpha = life > 0.82 ? Math.max(0, 1 - (life - 0.82) / 0.18) : 1;
      const fl = Math.max(0.18, Math.abs(Math.sin(el * p.flut + p.phase)));

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.shape === 'dot') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.scale(1, p.shape === 'ribbon' ? fl : 0.35 + fl * 0.65);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }
      ctx.restore();
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.y > H + 60 || el - p.born > p.ttl) parts.splice(i, 1);
    }

    if (el < durationMs + 4200) raf = requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    ctx.clearRect(0, 0, W, H);
  };
}
