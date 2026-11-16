import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const FinancialHealthIcons = {
  ok: Glyphs.success,
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  trendUp: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
  trendDown: { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down', web: 'trending_down' },
  trendFlat: { ios: 'minus', android: 'trending_flat', web: 'trending_flat' },
} satisfies Record<string, IconName>;
