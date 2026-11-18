// Mốc theo MAX(id) (quyết định của user): SELECT MAX(id) là O(1) trên PK
export const TARGET = 1_000_000;
export const ARM_AT = 999_991;

// Kịch bản video (ms)
export const INTRO = 4200;
export const FAST_MS = 35; // ~990 sub cuối chạy nhanh, mỗi sub 35ms
export const FINAL_MS = 520; // 10 sub cuối chậm dần, YouTube live-count style
export const ROLL = 1250; // roll 999.999 -> 1.000.000
export const FINALE = 8000; // confetti + card sub thứ 1 triệu

/**
 * rows: ascending [{id, date, username, code, name, lang, result}]
 * Schedule là nguồn chân lý CHO CẢ video (trang /replay) VÀ audio (tick),
 * nên hình + tiếng luôn khớp nhau tuyệt đối.
 */
export function buildSchedule(rows, { target, dry = false }) {
  const main = rows.filter((r) => r.id < target);
  const last10 = main.slice(-10);
  const fast = main.slice(0, Math.max(0, main.length - 10));

  const events = [];
  let t = INTRO;
  fast.forEach((r, i) => {
    events.push({ t: Math.round(t), v: r.id, w: i % 100 === 99 ? 2 : 1 });
    t += FAST_MS;
  });
  last10.forEach((r) => {
    events.push({ t: Math.round(t), v: r.id, w: 3 });
    t += FINAL_MS;
  });
  const tTarget = Math.round(t + ROLL);
  events.push({ t: tTarget, v: target, w: 3 });

  const millionth = rows.find((r) => r.id >= target) || null;

  return {
    target,
    dry,
    totalMs: tTarget + FINALE,
    events,
    timings: { intro: INTRO, finaleStart: tTarget, finaleMs: FINALE },
    meta: {
      millionth,
      startV: main.length ? main[0].id : target,
      generatedAt: new Date().toISOString(),
    },
  };
}
