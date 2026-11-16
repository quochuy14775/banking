import type { QuickActionKey } from '@/models';

import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const QuickActionIcons = {
  transfer: Glyphs.send,
  qr: Glyphs.qrScan,
  topup: Glyphs.phone,
  bills: Glyphs.receipt,
  history: Glyphs.history,
} satisfies Record<QuickActionKey, IconName>;
