import { Glyphs } from './glyphs';
import type { IconName } from './types';

export const TabBarIcons = {
  home: {
    default: { ios: 'house', android: 'home', web: 'home' },
    active: Glyphs.home,
  },
  profile: {
    default: Glyphs.person,
    active: { ios: 'person.fill', android: 'person', web: 'person' },
  },
} satisfies Record<string, { default: IconName; active: IconName }>;
