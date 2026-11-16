import type { BillCategory } from '@/models';

import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const BillCategoryIcons = {
  electricity: { ios: 'bolt.fill', android: 'bolt', web: 'bolt' },
  water: { ios: 'drop.fill', android: 'water_drop', web: 'water_drop' },
  internet: { ios: 'wifi', android: 'wifi', web: 'wifi' },
  tv: { ios: 'tv', android: 'tv', web: 'tv' },
  mobile: Glyphs.phone,
  tuition: Glyphs.school,
  insurance: { ios: 'cross.case.fill', android: 'health_and_safety', web: 'health_and_safety' },
  other: Glyphs.more,
} satisfies Record<BillCategory | 'other', IconName>;

export const BillIcons = {
  history: Glyphs.history,
  autoPay: { ios: 'repeat', android: 'repeat', web: 'repeat' },
} satisfies Record<string, IconName>;
