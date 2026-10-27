import type { FinancialHealthStatus, FinancialHealthTrendPoint } from '@/models';

export type ScoreDirection = 'up' | 'down' | 'flat';

export function getHealthStatus(score: number, maxScore = 100): FinancialHealthStatus {
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  if (percent >= 70) return 'good';
  if (percent >= 40) return 'average';
  return 'poor';
}

export function getScoreChange(trend: FinancialHealthTrendPoint[]): number {
  if (trend.length < 2) return 0;
  return trend[trend.length - 1].score - trend[trend.length - 2].score;
}

export function getScoreDirection(change: number): ScoreDirection {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
}
