import type { IconName } from './types';

export const CommonIcons = {
  plus: { ios: 'plus', android: 'add', web: 'add' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  eye: { ios: 'eye', android: 'visibility', web: 'visibility' },
  eyeSlash: { ios: 'eye.slash', android: 'visibility_off', web: 'visibility_off' },
  externalLink: { ios: 'arrow.up.right.square', android: 'open_in_new', web: 'link' },
} satisfies Record<string, IconName>;
