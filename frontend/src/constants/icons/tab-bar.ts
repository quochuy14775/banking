import type { IconName } from './types';

export const TabBarIcons = {
  home: {
    default: { ios: 'house', android: 'home', web: 'home' },
    active: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  profile: {
    default: { ios: 'person', android: 'person', web: 'person' },
    active: { ios: 'person.fill', android: 'person', web: 'person' },
  },
} satisfies Record<string, { default: IconName; active: IconName }>;
