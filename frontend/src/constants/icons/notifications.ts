import type { IconName } from './types';

export const NotificationIcons = {
  bell: { ios: 'bell', android: 'notifications', web: 'notifications' },
  markAllRead: { ios: 'checkmark.circle', android: 'done_all', web: 'done_all' },
  empty: { ios: 'bell.slash', android: 'notifications_off', web: 'notifications_off' },
} satisfies Record<string, IconName>;
