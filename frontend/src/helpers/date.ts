/** 'YYYY-MM-DD' → 'dd/mm/yyyy' */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface DayLabels {
  today: string;
  yesterday: string;
}

export function formatDayLabel(iso: string, labels: DayLabels, now: Date = new Date()): string {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return labels.today;
  if (dayKey(d) === dayKey(yesterday)) return labels.yesterday;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export interface DayGroup<T> {
  key: string;
  title: string;
  data: T[];
}

export function groupByDay<T>(
  items: T[],
  getIso: (item: T) => string,
  labels: DayLabels,
  now: Date = new Date(),
): DayGroup<T>[] {
  const sorted = [...items].sort((a, b) => getIso(b).localeCompare(getIso(a)));
  const groups: DayGroup<T>[] = [];
  for (const item of sorted) {
    const iso = getIso(item);
    const key = dayKey(new Date(iso));
    const last = groups[groups.length - 1];
    if (last?.key === key) last.data.push(item);
    else groups.push({ key, title: formatDayLabel(iso, labels, now), data: [item] });
  }
  return groups;
}
