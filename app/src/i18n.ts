export type Lang = 'vi' | 'en';

export interface Strings {
  site: string;
  title: string;
  subtitle: string;
  phaseIdle: string;
  phaseArmed: string;
  phaseDone: string;
  last24h: string;
  perHour: string;
  remaining: string;
  progress: string;
  langToggle: string;
  videoPage: string;
  videoTitle: string;
  videoNone: string;
  videoRendering: string;
  videoFailed: string;
  videoDoneMp4: string;
  videoDoneWebm: string;
  rerender: string;
  dryrun: string;
  millionth: string;
  millionthBy: string;
  millionthProblem: string;
  millionthAt: string;
  replayTitle: string;
  // ---- key mới (YouTube-style upgrade) ----
  liveCount: string;
  backHome: string;
  millionthLang: string;
  millionthResult: string;
}

const vi: Strings = {
  site: 'CLUE OJ',
  title: 'BỘ ĐẾM SUBMISSION',
  subtitle: 'Hành trình đến 1.000.000 lượt nộp bài',
  phaseIdle: 'Đang canh mốc 1.000.000',
  phaseArmed: 'Sắp chạm mốc!',
  phaseDone: 'ĐÃ ĐẠT 1.000.000',
  last24h: '24 giờ qua',
  perHour: 'mỗi giờ',
  remaining: 'Còn lại',
  progress: 'Tiến độ',
  langToggle: 'EN',
  videoPage: 'Trang video',
  videoTitle: 'Video kỷ niệm 1.000.000 submission',
  videoNone: 'Chưa có video — sẽ tự quay khi chạm mốc 1.000.000.',
  videoRendering: 'Đang quay video…',
  videoFailed: 'Render lỗi',
  videoDoneMp4: 'Tải MP4',
  videoDoneWebm: 'Tải WebM',
  rerender: 'Quay lại video',
  dryrun: 'Dry-run test',
  millionth: 'SUBMISSION THỨ 1.000.000',
  millionthBy: 'Người nộp',
  millionthProblem: 'Bài',
  millionthAt: 'Thời điểm',
  replayTitle: '1.000.000 SUBMISSIONS — CLUE OJ',
  liveCount: 'BỘ ĐẾM TRỰC TIẾP',
  backHome: '← Về bộ đếm',
  millionthLang: 'Ngôn ngữ',
  millionthResult: 'Kết quả',
};

const en: Strings = {
  site: 'CLUE OJ',
  title: 'SUBMISSION COUNTER',
  subtitle: 'The road to 1,000,000 submissions',
  phaseIdle: 'Watching for 1,000,000',
  phaseArmed: 'Almost there!',
  phaseDone: '1,000,000 REACHED',
  last24h: 'Last 24h',
  perHour: 'per hour',
  remaining: 'Remaining',
  progress: 'Progress',
  langToggle: 'VI',
  videoPage: 'Video page',
  videoTitle: '1,000,000 submissions commemorative video',
  videoNone: 'No video yet — auto-recorded when 1,000,000 is hit.',
  videoRendering: 'Recording video…',
  videoFailed: 'Render failed',
  videoDoneMp4: 'Download MP4',
  videoDoneWebm: 'Download WebM',
  rerender: 'Re-render video',
  dryrun: 'Dry-run test',
  millionth: 'SUBMISSION #1,000,000',
  millionthBy: 'Submitter',
  millionthProblem: 'Problem',
  millionthAt: 'Time',
  replayTitle: '1,000,000 SUBMISSIONS — CLUE OJ',
  liveCount: 'LIVE COUNT',
  backHome: '← Back to counter',
  millionthLang: 'Language',
  millionthResult: 'Result',
};

export const STR: Record<Lang, Strings> = { vi, en };

export function fmt(n: number, lang: Lang): string {
  return new Intl.NumberFormat(lang === 'vi' ? 'vi-VN' : 'en-US').format(n);
}

export function fmtDate(iso: string, lang: Lang): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(d);
}
