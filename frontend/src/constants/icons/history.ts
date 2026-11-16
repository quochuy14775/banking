import type { TransactionCategory } from '@/models';

import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const TransactionCategoryIcons = {
  transfer: { ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' },
  bill: Glyphs.receipt,
  salary: { ios: 'banknote', android: 'payments', web: 'payments' },
  payment: Glyphs.shoppingBag,
  topup: Glyphs.phone,
  cash: { ios: 'dollarsign.circle', android: 'local_atm', web: 'local_atm' },
  interest: { ios: 'percent', android: 'percent', web: 'percent' },
  savings: { ios: 'building.columns', android: 'savings', web: 'savings' },
} satisfies Record<TransactionCategory, IconName>;

export const HistoryIcons = {
  statement: Glyphs.statement,
  moneyIn: { ios: 'arrow.down.left', android: 'south_west', web: 'south_west' },
  moneyOut: { ios: 'arrow.up.right', android: 'north_east', web: 'north_east' },
  empty: { ios: 'tray', android: 'inbox', web: 'inbox' },
  pdf: { ios: 'arrow.down.doc', android: 'picture_as_pdf', web: 'picture_as_pdf' },
  copy: Glyphs.copy,
} satisfies Record<string, IconName>;
