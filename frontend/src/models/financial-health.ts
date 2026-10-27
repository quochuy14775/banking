export type FinancialHealthStatus = 'good' | 'average' | 'poor';

export interface FinancialHealthItem {
  label: string;
  shortLabel: string;
  ok: boolean;
}

export interface FinancialHealthTrendPoint {
  label: string;
  score: number;
}

export interface FinancialHealth {
  score: number;
  maxScore: number;
  message: string;
  checklist: FinancialHealthItem[];
  trend: FinancialHealthTrendPoint[];
  percentile?: number;
}

export interface GetFinancialHealthRequest {
  userId: string;
}

export interface GetFinancialHealthResponse {
  success: boolean;
  data?: FinancialHealth;
  message?: string;
}
