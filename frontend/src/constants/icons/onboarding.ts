import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const OnboardingIcons = {
  qr: Glyphs.qrScan,
  photo: { ios: 'camera', android: 'photo_camera', web: 'photo_camera' },
  review: Glyphs.securityShield,
  login: Glyphs.key,
  phone: Glyphs.phone,
  email: { ios: 'envelope', android: 'mail', web: 'mail' },
  pending: { ios: 'hourglass', android: 'hourglass_top', web: 'hourglass_top' },
  rejected: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
} satisfies Record<string, IconName>;
