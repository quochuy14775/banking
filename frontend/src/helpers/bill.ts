// Tiện ích ngày cho màn Hóa đơn. Ngày lưu dạng ISO `YYYY-MM-DD`, so sánh theo ngày lịch (giờ máy).

const DAY_MS = 86_400_000;

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type WeekdayKey = (typeof WEEKDAY_KEYS)[number];

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Số ngày từ hôm nay tới `iso` (âm = đã qua). */
export function daysUntil(iso: string): number {
  return Math.round((parseISODate(iso).getTime() - startOfToday().getTime()) / DAY_MS);
}

/** `dd/MM` */
export function formatDayMonth(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

/** `dd/MM/yyyy` */
export function formatFullDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function weekdayKey(iso: string): WeekdayKey {
  return WEEKDAY_KEYS[parseISODate(iso).getDay()];
}

/** `count` ngày liên tiếp bắt đầu từ hôm nay. */
export function upcomingDays(count: number): string[] {
  const today = startOfToday();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return toISODate(d);
  });
}
