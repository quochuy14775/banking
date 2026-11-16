export type SpendingCategoryKey = 'food' | 'housing' | 'transport' | 'shopping' | 'other';

export interface SpendingCategory {
  key: SpendingCategoryKey;
  amount: number;
  /** Số tiền cùng danh mục ở tháng liền trước, để tính mức tăng/giảm. */
  previousAmount: number;
}

export interface MonthlySpending {
  /** Ngày ISO `YYYY-MM-01` của tháng. */
  month: string;
  total: number;
  categories: SpendingCategory[];
}

export interface SpendingSummary {
  current: MonthlySpending;
  previous: MonthlySpending;
  /** Ngân sách chi tiêu cả tháng người dùng tự đặt. */
  monthlyBudget: number;
}

export interface GetSpendingSummaryRequest {
  userId: string;
}

export interface GetSpendingSummaryResponse {
  success: boolean;
  data?: SpendingSummary;
  message?: string;
}

/** Gợi ý: một danh mục tăng mạnh so với tháng trước, kèm mức chi mỗi ngày để giữ ngân sách. */
export interface SpendingInsight {
  id: string;
  kind: 'overspend';
  category: SpendingCategoryKey;
  amount: number;
  changePercent: number;
  /** Tổng chi tối đa mỗi ngày còn lại để không vượt ngân sách tháng. */
  dailyLimit: number;
}

export interface GetInsightsRequest {
  userId: string;
}

export interface GetInsightsResponse {
  success: boolean;
  items: SpendingInsight[];
  message?: string;
}

export interface DismissInsightRequest {
  insightId: string;
}

export type SavingsGoalIcon = 'travel' | 'emergency' | 'home' | 'education';

export interface SavingsGoal {
  id: string;
  name: string;
  icon: SavingsGoalIcon;
  saved: number;
  target: number;
  /** Ngày ISO bắt đầu và hạn của mục tiêu. */
  startDate: string;
  deadline: string;
}

export interface GetSavingsGoalsRequest {
  userId: string;
}

export interface GetSavingsGoalsResponse {
  success: boolean;
  items: SavingsGoal[];
  message?: string;
}

export interface ContributeGoalRequest {
  userId: string;
  goalId: string;
  amount: number;
}

export interface ContributeGoalResponse {
  success: boolean;
  goal?: SavingsGoal;
  message?: string;
}
