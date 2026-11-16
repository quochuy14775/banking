import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const SmartOtpIcons = {
  shield: Glyphs.securityShield,
  key: Glyphs.key,
  offline: { ios: 'wifi.slash', android: 'wifi_off', web: 'wifi_off' },
  timer: { ios: 'timer', android: 'timer', web: 'timer' },
  device: Glyphs.phone,
  warning: { ios: 'exclamationmark.triangle', android: 'warning', web: 'warning' },
} satisfies Record<string, IconName>;
