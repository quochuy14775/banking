export function formatBadgeCount(count: number, max = 9): string {
  return count > max ? `${max}+` : String(count);
}
