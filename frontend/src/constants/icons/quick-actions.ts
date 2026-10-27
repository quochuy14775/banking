import type { QuickActionKey } from '@/models';

import type { IconName } from './types';

export const QuickActionIcons = {
  transfer: { ios: 'paperplane.fill', android: 'send', web: 'send' },
  qr: { ios: 'qrcode.viewfinder', android: 'qr_code_scanner', web: 'qr_code_scanner' },
  topup: { ios: 'iphone', android: 'smartphone', web: 'smartphone' },
  bills: { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' },
  history: { ios: 'clock.arrow.circlepath', android: 'history', web: 'history' },
} satisfies Record<QuickActionKey, IconName>;
