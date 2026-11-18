import { q, esc } from './db.mjs';
import { TARGET } from './timeline.mjs';

// Lấy ~1100 sub cuối kèm thông tin hiển thị (username, bài, ngôn ngữ)
export async function fetchTail(fromId) {
  return q(
    `SELECT s.id, UNIX_TIMESTAMP(s.date) AS ts, u.username, p.code, p.name AS problem_name,
            l.short_name AS lang, s.result
     FROM judge_submission s
     LEFT JOIN auth_user u ON u.id = s.user_id
     LEFT JOIN judge_problem p ON p.id = s.problem_id
     LEFT JOIN judge_language l ON l.id = s.language_id
     WHERE s.id >= ${esc(fromId)}
     ORDER BY s.id ASC`
  );
}

export async function buildRealSchedule() {
  const rows = await fetchTail(TARGET - 1100);
  const { buildSchedule } = await import('./timeline.mjs');
  return buildSchedule(rows, { target: TARGET, dry: false });
}
