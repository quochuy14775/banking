import type { SavingsGoal } from '@/models';

import { parseISODate, startOfToday } from './bill';

const DAY_MS = 86_400_000;

export type GoalStatus = 'done' | 'onTrack' | 'behind';

/** Số tháng (làm tròn lên) từ hôm nay đến hạn; đã quá hạn thì 0. */
export function monthsLeft(deadline: string): number {
  const days = (parseISODate(deadline).getTime() - startOfToday().getTime()) / DAY_MS;
  return days <= 0 ? 0 : Math.ceil(days / 30);
}

/** Số tiền cần góp mỗi tháng còn lại để kịp hạn. */
export function requiredMonthly(goal: SavingsGoal): number {
  const remaining = Math.max(goal.target - goal.saved, 0);
  const months = monthsLeft(goal.deadline);
  return months === 0 ? remaining : Math.ceil(remaining / months / 10_000) * 10_000;
}

/** So số đã góp với mức "lẽ ra phải có" nếu góp đều từ ngày bắt đầu đến hạn. */
export function goalStatus(goal: SavingsGoal): GoalStatus {
  if (goal.saved >= goal.target) return 'done';
  const start = parseISODate(goal.startDate).getTime();
  const end = parseISODate(goal.deadline).getTime();
  const elapsed = Math.min(Math.max((startOfToday().getTime() - start) / (end - start), 0), 1);
  return goal.saved >= goal.target * elapsed ? 'onTrack' : 'behind';
}

export function goalProgress(goal: SavingsGoal): number {
  return goal.target > 0 ? Math.min(goal.saved / goal.target, 1) : 0;
}

/** Tổng số tháng của mục tiêu (từ tháng bắt đầu tới tháng đến hạn), tối thiểu 1. Mỗi tháng là một ô trên "thẻ tích tháng". */
export function goalMonths(goal: SavingsGoal): number {
  const start = parseISODate(goal.startDate);
  const end = parseISODate(goal.deadline);
  return Math.max((end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth(), 1);
}

/** Ô của tháng hiện tại (0 = tháng bắt đầu), giới hạn trong khoảng các ô của mục tiêu. */
export function currentGoalMonth(goal: SavingsGoal): number {
  const start = parseISODate(goal.startDate);
  const now = startOfToday();
  const index = (now.getFullYear() - start.getFullYear()) * 12 + now.getMonth() - start.getMonth();
  return Math.min(Math.max(index, 0), goalMonths(goal) - 1);
}

/** `MM/yyyy` của hạn mục tiêu. */
export function formatMonthYear(iso: string): string {
  const [y, m] = iso.split('-');
  return `${m}/${y}`;
}
