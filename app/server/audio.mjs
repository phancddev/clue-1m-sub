import fs from 'node:fs';

// Tổng hợp âm thanh bằng pure Node: tick khi số nhảy (w1/w2/w3), riser cho 10 sub
// cuối, fanfare lúc chạm mốc. Không file ngoài, không bản quyền, khớp schedule.
const SR = 44100;

function tickParams(w) {
  if (w === 1) return { f: 1900, k: 140, dur: 0.05, amp: 0.2 };
  if (w === 2) return { f: 1300, k: 110, dur: 0.07, amp: 0.28 };
  return { f: 750, k: 70, dur: 0.12, amp: 0.42 };
}

function renderTick(buf, atSec, w) {
  const { f, k, dur, amp } = tickParams(w);
  const n0 = Math.floor(atSec * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const idx = n0 + i;
    if (idx < 0 || idx >= buf.length) continue;
    const t = i / SR;
    let v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * k);
    if (i < SR * 0.003) v += (Math.random() * 2 - 1) * 0.3 * (1 - i / (SR * 0.003)); // click
    buf[idx] += v * amp;
  }
}

function renderNote(buf, atSec, f, dur, amp, decay = 3) {
  const n0 = Math.floor(atSec * SR);
  const len = Math.floor(dur * SR);
  for (let i = 0; i < len; i++) {
    const idx = n0 + i;
    if (idx < 0 || idx >= buf.length) continue;
    const t = i / SR;
    const env = Math.min(1, t * 80) * Math.exp(-t * decay);
    const v = (Math.sin(2 * Math.PI * f * t) + 0.5 * Math.sin(4 * Math.PI * f * t) + 0.25 * Math.sin(6 * Math.PI * f * t)) / 1.75;
    buf[idx] += v * env * amp;
  }
}

function renderRiser(buf, fromSec, durSec) {
  const n0 = Math.floor(fromSec * SR);
  const len = Math.floor(durSec * SR);
  for (let i = 0; i < len; i++) {
    const idx = n0 + i;
    if (idx < 0 || idx >= buf.length) continue;
    const p = i / len;
    const t = i / SR;
    const f = 220 + 440 * p;
    const env = p * p * 0.12;
    buf[idx] += Math.sin(2 * Math.PI * f * t) * env;
  }
}

export async function synthAudio(sched, outPath) {
  const totalSec = sched.totalMs / 1000 + 2.5; // dư đệm so với video, -shortest sẽ cắt
  const N = Math.floor(totalSec * SR);
  const L = new Float64Array(N);

  for (const ev of sched.events) renderTick(L, ev.t / 1000, ev.w);

  const last10Start = (() => {
    const w3 = sched.events.filter((e) => e.w === 3);
    return w3.length ? w3[0].t / 1000 : sched.timings.finaleStart / 1000 - 5.2;
  })();
  renderRiser(L, last10Start, sched.timings.finaleStart / 1000 - last10Start);

  // Fanfare: arpeggio + hợp âm kết + tremolo nhẹ
  const f0 = sched.timings.finaleStart / 1000;
  [392.0, 523.25, 659.25, 783.99].forEach((f, i) => renderNote(L, f0 + i * 0.18, f, 0.55, 0.32));
  [523.25, 659.25, 783.99, 1046.5].forEach((f) => renderNote(L, f0 + 0.75, f, 1.9, 0.22, 1.4));
  // Shimmer kết
  renderNote(L, f0 + 0.75, 2093.0, 1.4, 0.06, 1.2);

  // Normalize + fade out cuối
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]));
  const g = peak > 0 ? 0.88 / peak : 1;
  const fadeN = Math.floor(0.4 * SR);
  const out = Buffer.alloc(N * 2);
  for (let i = 0; i < N; i++) {
    let v = L[i] * g;
    if (i > N - fadeN) v *= (N - i) / fadeN;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2);
  }

  // WAV header (mono 16-bit)
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + out.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(out.length, 40);

  fs.writeFileSync(outPath, Buffer.concat([header, out]));
  return outPath;
}
