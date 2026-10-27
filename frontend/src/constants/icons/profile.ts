import type { IconName } from './types';

export const ProfileIcons = {
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  verified: { ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' },
  copy: { ios: 'doc.on.doc', android: 'content_copy', web: 'content_copy' },
  share: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  save: { ios: 'arrow.down.to.line', android: 'download', web: 'download' },
  logout: {
    ios: 'rectangle.portrait.and.arrow.right',
    android: 'logout',
    web: 'logout',
  },
} satisfies Record<string, IconName>;
