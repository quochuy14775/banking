import type { DateRange } from '@/models';

import { startOfToday, toISODate } from './bill';

/** `days` ngày gần nhất, tính cả hôm nay. */
export function recentDays(days: number): DateRange {
  const today = startOfToday();
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));
  return { from: toISODate(from), to: toISODate(today) };
}

export interface MonthPeriod extends DateRange {
  /** 1–12 */
  month: number;
  year: number;
}

/** Tháng lùi `offset` tháng so với tháng này; tháng này chỉ tính tới hôm nay. */
export function monthPeriod(offset: number): MonthPeriod {
  const today = startOfToday();
  const first = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  const last = offset === 0 ? today : new Date(first.getFullYear(), first.getMonth() + 1, 0);
  return { from: toISODate(first), to: toISODate(last), month: first.getMonth() + 1, year: first.getFullYear() };
}

/** `•••• 1234`: chỉ hiện 4 số cuối của số tài khoản. */
export function maskAccountNumber(number: string): string {
  return `•••• ${number.replace(/\D/g, '').slice(-4)}`;
}
