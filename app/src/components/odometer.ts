// Odometer kiểu YouTube live-count: mỗi chữ số là 1 cột strip 0-9 lăn dọc
// trong "digit box" (ô vuông bo góc, bg tối, viền), separator giữa nhóm 3.
// API cố định theo contract:
//   createOdometer(root, { digits, sep }).set(n)  — digits mặc định 7.
// sep: ký tự phân cách nhóm 3 chữ số ('.' cho vi, ',' cho en); '' = ẩn.
export interface Odometer {
  set(n: number): void;
  el: HTMLElement;
}

const DIGITS = '0123456789';

export function createOdometer(
  root: HTMLElement,
  opts: { digits?: number; sep?: string } = {},
): Odometer {
  const digits = opts.digits ?? 7;
  const sep = opts.sep ?? '.';
  const max = 10 ** digits - 1;
  root.classList.add('odo');
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-atomic', 'true');

  // Mỗi cột: strip 0-9 + bản "0" nhân bản (index 10). `phys` = index đang nằm
  // trong ô cửa; hiển thị digit = phys % 10. Mọi lần set đều lăn TỚI (quãng
  // (cur - shown + 10) % 10) để 9 -> 0 lăn liền mạch xuống bản "0" nhân bản,
  // rồi snap lặng về 0 khi transition xong — không bao giờ lăn ngược.
  interface Col {
    strip: HTMLElement;
    phys: number; // 0..9, 10 = bản "0" nhân bản
    snapT: number | undefined; // id của setTimeout snap về 0 sau khi lăn xong
  }

  const cols: Col[] = [];
  for (let i = 0; i < digits; i++) {
    const col = document.createElement('div');
    col.className = 'odo-col';
    const strip = document.createElement('div');
    strip.className = 'odo-strip';
    for (const d of DIGITS) {
      const s = document.createElement('span');
      s.className = 'odo-digit';
      s.textContent = d;
      strip.appendChild(s);
    }
    // bản 0 thứ hai để roll 9 -> 0 liền mạch
    const s0 = document.createElement('span');
    s0.className = 'odo-digit';
    s0.textContent = '0';
    strip.appendChild(s0);
    col.appendChild(strip);
    root.appendChild(col);
    cols.push({ strip, phys: 0, snapT: undefined });
    // separator giữa các nhóm 3 chữ số (đếm từ phải sang trái)
    if (sep && i < digits - 1 && (digits - 1 - i) % 3 === 0) {
      const sp = document.createElement('div');
      sp.className = 'odo-sep';
      sp.setAttribute('aria-hidden', 'true');
      sp.textContent = sep;
      root.appendChild(sp);
    }
  }

  // Phải khớp `transition` của .odo-strip trong global.css (sau đó + biên độ).
  const ROLL_MS = 340;

  function roll(col: Col, cur: number) {
    const shown = col.phys % 10;
    if (cur === shown) return;
    if (col.snapT !== undefined) {
      clearTimeout(col.snapT);
      col.snapT = undefined;
    }
    const d = (cur - shown + 10) % 10; // luôn lăn tới, 1..9
    if (col.phys + d <= 10) {
      col.phys += d;
      col.strip.style.transform = `translateY(${-col.phys * 100}%)`;
      if (col.phys === 10) {
        // đang hiện bản "0" nhân bản — snap lặng về 0 sau khi lăn xong
        col.snapT = setTimeout(() => {
          col.strip.style.transition = 'none';
          col.strip.style.transform = 'translateY(0%)';
          void col.strip.offsetHeight;
          col.strip.style.transition = '';
          col.phys = 0;
          col.snapT = undefined;
        }, ROLL_MS + 40);
      }
    } else {
      // chỉ xảy ra khi phys = 10 (bản "0" nhân bản) mà cần lăn tới > 0:
      // snap lặng về 0 (cùng hình ảnh) rồi lăn tới cur
      col.strip.style.transition = 'none';
      col.strip.style.transform = 'translateY(0%)';
      void col.strip.offsetHeight;
      col.strip.style.transition = '';
      col.phys = cur;
      col.strip.style.transform = `translateY(${-cur * 100}%)`;
    }
  }

  function set(n: number) {
    const str = String(Math.max(0, Math.min(n, max))).padStart(digits, '0');
    for (let i = 0; i < digits; i++) roll(cols[i], Number(str[i]));
  }

  set(0);
  return { set, el: root };
}

declare global {
  interface Window {
    __replayDone?: boolean;
    __REPLAY?: {
      target: number;
      dry: boolean;
      totalMs: number;
      events: { t: number; v: number; w: 1 | 2 | 3 }[];
      timings: { intro: number; finaleStart: number; finaleMs: number };
      meta: {
        millionth: {
          id: number;
          ts: number;
          username: string | null;
          code: string | null;
          problem_name: string | null;
          lang: string | null;
          result: string | null;
        } | null;
        startV: number;
        generatedAt: string;
      };
    };
  }
}
