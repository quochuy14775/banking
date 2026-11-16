import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const KycIcons = {
  idCard: { ios: 'person.text.rectangle', android: 'badge', web: 'badge' },
  verified: Glyphs.verified,
  locked: Glyphs.lock,
  rescan: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  check: Glyphs.check,
} satisfies Record<string, IconName>;
