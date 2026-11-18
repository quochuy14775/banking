import { MOCK_MONTHLY_BUDGET, mockSavingsGoals, mockSpendingMonths } from '@/shared/lib/mockData';
import type {
  ContributeGoalRequest,
  ContributeGoalResponse,
  DismissInsightRequest,
  GetInsightsRequest,
  GetInsightsResponse,
  GetSavingsGoalsRequest,
  GetSavingsGoalsResponse,
  GetSpendingSummaryRequest,
  GetSpendingSummaryResponse,
  SavingsGoal,
  SpendingInsight,
} from '@/models';

const MOCK_DELAY_MS = 400;
// Danh mục tăng từ mức này trở lên so với tháng trước mới đáng nhắc.
const OVERSPEND_THRESHOLD_PERCENT = 20;

// Trạng thái mock trong bộ nhớ; khi có BE thì nằm phía server.
const goals: SavingsGoal[] = mockSavingsGoals.map((g) => ({ ...g }));
const dismissedInsights = new Set<string>();

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Số ngày còn lại trong tháng, tính cả hôm nay. */
function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return lastDay - now.getDate() + 1;
}

export async function getSpendingSummary(req: GetSpendingSummaryRequest): Promise<GetSpendingSummaryResponse> {
  if (!req.userId) return { success: false, message: 'Thiếu thông tin người dùng.' };
  return { success: true, data: { ...mockSpendingMonths, monthlyBudget: MOCK_MONTHLY_BUDGET } };
}

export async function getInsights(req: GetInsightsRequest): Promise<GetInsightsResponse> {
  if (!req.userId) return { success: false, items: [], message: 'Thiếu thông tin người dùng.' };
  const { current } = mockSpendingMonths;
  const remaining = Math.max(MOCK_MONTHLY_BUDGET - current.total, 0);
  const dailyLimit = Math.floor(remaining / daysLeftInMonth() / 1_000) * 1_000;
  const items: SpendingInsight[] = current.categories
    .filter((c) => c.previousAmount > 0)
    .map((c) => ({ c, percent: Math.round(((c.amount - c.previousAmount) / c.previousAmount) * 100) }))
    .filter(({ percent }) => percent >= OVERSPEND_THRESHOLD_PERCENT)
    .sort((a, b) => b.percent - a.percent)
    .map(({ c, percent }) => ({
      id: `overspend-${current.month}-${c.key}`,
      kind: 'overspend' as const,
      category: c.key,
      amount: c.amount,
      changePercent: percent,
      dailyLimit,
    }))
    .filter((i) => !dismissedInsights.has(i.id));
  return { success: true, items };
}

export async function dismissInsight(req: DismissInsightRequest): Promise<{ success: boolean }> {
  dismissedInsights.add(req.insightId);
  return { success: true };
}

export async function getSavingsGoals(req: GetSavingsGoalsRequest): Promise<GetSavingsGoalsResponse> {
  if (!req.userId) return { success: false, items: [], message: 'Thiếu thông tin người dùng.' };
  return { success: true, items: goals.map((g) => ({ ...g })) };
}

export async function contributeToGoal(req: ContributeGoalRequest): Promise<ContributeGoalResponse> {
  const goal = goals.find((g) => g.id === req.goalId);
  if (!req.userId || !goal) return { success: false, message: 'Mục tiêu không tồn tại.' };
  if (req.amount <= 0) return { success: false, message: 'Số tiền không hợp lệ.' };
  await delay(MOCK_DELAY_MS);
  goal.saved = Math.min(goal.saved + req.amount, goal.target);
  return { success: true, goal: { ...goal } };
}
