import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const SettingsIcons = {
  qr: Glyphs.qrCode,
  profile: Glyphs.account,
  smartOtp: Glyphs.securityShield,
  devices: { ios: 'laptopcomputer.and.iphone', android: 'devices', web: 'devices' },
  faceId: Glyphs.faceId,
  password: Glyphs.key,
  language: { ios: 'globe', android: 'language', web: 'language' },
  theme: { ios: 'paintpalette', android: 'palette', web: 'palette' },
  light: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  system: Glyphs.phone,
} satisfies Record<string, IconName>;
