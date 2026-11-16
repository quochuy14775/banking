import type { AppFeatureId } from '@/models';

import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const FeatureIcons = {
  transfer: Glyphs.send,
  qrScan: Glyphs.qrScan,
  qrReceive: Glyphs.qrCode,
  topup: Glyphs.phone,
  bills: Glyphs.receipt,
  history: Glyphs.history,
  statement: Glyphs.statement,
  exchange: { ios: 'dollarsign.arrow.circlepath', android: 'currency_exchange', web: 'currency_exchange' },
  budget: { ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' },
  goals: { ios: 'target', android: 'savings', web: 'savings' },
  cards: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  cardLock: Glyphs.lock,
  changePin: { ios: 'key.fill', android: 'key', web: 'key' },
  profile: Glyphs.account,
  ekyc: Glyphs.verified,
} satisfies Record<AppFeatureId, IconName>;

export const SearchIcons = {
  search: Glyphs.search,
} satisfies Record<string, IconName>;
