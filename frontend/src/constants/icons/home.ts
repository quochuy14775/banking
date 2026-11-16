import type { SavingsGoalIcon, SpendingCategoryKey } from '@/models';

import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const SpendingCategoryIcons = {
  food: { ios: 'fork.knife', android: 'restaurant', web: 'restaurant' },
  housing: Glyphs.home,
  transport: { ios: 'car.fill', android: 'directions_car', web: 'directions_car' },
  shopping: Glyphs.shoppingBag,
  other: Glyphs.more,
} satisfies Record<SpendingCategoryKey, IconName>;

export const SavingsGoalIcons = {
  travel: { ios: 'airplane', android: 'flight', web: 'flight' },
  emergency: { ios: 'umbrella.fill', android: 'umbrella', web: 'umbrella' },
  home: Glyphs.home,
  education: Glyphs.school,
} satisfies Record<SavingsGoalIcon, IconName>;

export const HomeIcons = {
  insight: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
  trendUp: { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' },
  trendDown: { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' },
} satisfies Record<string, IconName>;
