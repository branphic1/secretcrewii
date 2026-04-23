// 날짜 유틸 — 네이티브 Date 기반 (dayjs 불필요)

export const pad2 = (n) => String(n).padStart(2, '0');

export const toDateStr = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const fromDateStr = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayStr = () => toDateStr(new Date());

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const daysInMonth = (year, monthIndex0) =>
  new Date(year, monthIndex0 + 1, 0).getDate();

export const firstWeekdayOfMonth = (year, monthIndex0) =>
  new Date(year, monthIndex0, 1).getDay(); // 0=Sun

export const monthLabel = (year, monthIndex0) =>
  `${year}년 ${monthIndex0 + 1}월`;

export const shortMonth = (monthIndex0) =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][monthIndex0];

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export const isWeekend = (dateStr) => {
  const d = fromDateStr(dateStr);
  const w = d.getDay();
  return w === 0 || w === 6;
};

export const isSameDay = (a, b) => toDateStr(a) === toDateStr(b);

export const formatKoreanDate = (dateStr) => {
  const d = fromDateStr(dateStr);
  return `${d.getFullYear()}. ${pad2(d.getMonth() + 1)}. ${pad2(d.getDate())}`;
};

export const longKoreanDate = (dateStr) => {
  const d = fromDateStr(dateStr);
  const w = WEEKDAY_LABELS[d.getDay()];
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${w})`;
};

export const quarterOfMonth = (monthIndex0) => Math.floor(monthIndex0 / 3) + 1;

export const diffDays = (aStr, bStr) => {
  const a = fromDateStr(aStr);
  const b = fromDateStr(bStr);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
};
