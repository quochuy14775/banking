import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const LoginIcons = {
  user: Glyphs.person,
  lock: { ios: 'lock', android: 'lock', web: 'lock' },
  faceId: Glyphs.faceId,
} satisfies Record<string, IconName>;
