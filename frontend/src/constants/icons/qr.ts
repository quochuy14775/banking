import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const QrIcons = {
  torch: { ios: 'flashlight.on.fill', android: 'flashlight_on', web: 'flashlight_on' },
  torchOff: { ios: 'flashlight.off.fill', android: 'flashlight_off', web: 'flashlight_off' },
  photo: { ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  sample: Glyphs.qrCode,
} satisfies Record<string, IconName>;
