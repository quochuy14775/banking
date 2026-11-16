import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const TransferIcons = {
  back: { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' },
  bank: { ios: 'building.columns', android: 'account_balance', web: 'account_balance' },
  check: Glyphs.check,
  chevronDown: { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' },
  search: Glyphs.search,
  shield: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
  success: Glyphs.success,
  warning: { ios: 'exclamationmark.circle', android: 'error', web: 'error' },
} satisfies Record<string, IconName>;
