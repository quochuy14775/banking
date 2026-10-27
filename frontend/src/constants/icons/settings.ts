import type { IconName } from './types';

export const SettingsIcons = {
  qr: { ios: 'qrcode', android: 'qr_code', web: 'qr_code' },
  profile: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  smartOtp: { ios: 'lock.shield', android: 'security', web: 'security' },
  devices: { ios: 'laptopcomputer.and.iphone', android: 'devices', web: 'devices' },
  faceId: { ios: 'faceid', android: 'face', web: 'face' },
  password: { ios: 'key', android: 'key', web: 'key' },
  language: { ios: 'globe', android: 'language', web: 'language' },
  theme: { ios: 'paintpalette', android: 'palette', web: 'palette' },
  light: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' },
  dark: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' },
  system: { ios: 'iphone', android: 'smartphone', web: 'smartphone' },
} satisfies Record<string, IconName>;
