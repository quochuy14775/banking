/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export interface ThemeColors {
  text: string;
  textSecondary: string;
  textMuted: string;
  background: string;
  backgroundElement: string;
  backgroundSelected: string;
  border: string;
  overlay: string;
  cardShadow: string;
  tabBarShadow: string;
  fabShadow: string;
  primary: string;
  onPrimary: string;
  primarySoft: string;
  onPrimarySoft: string;
  hero: string;
  heroElement: string;
  onHero: string;
  onHeroMuted: string;
  onHeroSuccess: string;
  success: string;
  successSoft: string;
  danger: string;
  dangerSoft: string;
  notify: string;
  onNotify: string;
  notifyRipple: string;
  notifySoft: string;
  backgroundMuted: string;
  borderAccent: string;
  info: string;
  infoSoft: string;
  promo: string;
  promoSoft: string;
  scoreStart: string;
  scoreEnd: string;
  scoreGlow: string;
  scoreTrack: string;
  drawerStart: string;
  drawerMid: string;
  drawerEnd: string;
  drawerText: string;
  drawerTextMuted: string;
  drawerGlass: string;
  drawerGlassBorder: string;
  drawerIconBg: string;
  drawerTrack: string;
  drawerPositive: string;
  drawerAccent: string;
  drawerAccentAlt: string;
  drawerIndicator: string;
  drawerIndicatorText: string;
  drawerAvatarBg: string;
  logoutStart: string;
  logoutEnd: string;
  cardChip: string;
  cardChipLine: string;
  warning: string;
  warningSoft: string;
}

export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: '#1C1530',
    textSecondary: '#5F5873',
    textMuted: '#9A93AD',
    background: '#FAF8FF',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EDE9FE',
    border: '#E7E3F2',
    overlay: 'rgba(28, 21, 48, 0.62)',
    cardShadow: '0px 16px 28px -10px rgba(109, 40, 217, 0.55), 0px 4px 10px 0px rgba(28, 21, 48, 0.12)',
    tabBarShadow: '0px 10px 30px -12px rgba(28, 21, 48, 0.28), 0px 2px 8px 0px rgba(28, 21, 48, 0.06)',
    fabShadow: '0px 8px 18px -4px rgba(109, 40, 217, 0.5)',
    primary: '#6D28D9',
    onPrimary: '#FFFFFF',
    primarySoft: '#EDE9FE',
    onPrimarySoft: '#5B21B6',
    hero: '#6D28D9',
    heroElement: '#5B21B6',
    onHero: '#F5F3FF',
    onHeroMuted: '#DDD6FE',
    onHeroSuccess: '#86EFAC',
    success: '#16A34A',
    successSoft: '#DCFCE7',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    notify: '#C026D3',
    onNotify: '#FFFFFF',
    notifyRipple: 'rgba(217, 70, 239, 0.4)',
    notifySoft: 'rgba(250, 232, 255, 0.6)',
    backgroundMuted: '#F4F1FB',
    borderAccent: '#C4B5FD',
    info: '#1E40AF',
    infoSoft: '#DBEAFE',
    promo: '#9A3412',
    promoSoft: '#FFEDD5',
    scoreStart: '#818CF8',
    scoreEnd: '#C026D3',
    scoreGlow: '#E9D5FF',
    scoreTrack: '#F1F0FB',
    drawerStart: '#7C3AED',
    drawerMid: '#9333EA',
    drawerEnd: '#C026D3',
    drawerText: '#FFFFFF',
    drawerTextMuted: '#EDE9FE',
    drawerGlass: 'rgba(255, 255, 255, 0.14)',
    drawerGlassBorder: 'rgba(255, 255, 255, 0.24)',
    drawerIconBg: 'rgba(255, 255, 255, 0.2)',
    drawerTrack: 'rgba(28, 21, 48, 0.22)',
    drawerPositive: '#BBF7D0',
    drawerAccent: '#C026D3',
    drawerAccentAlt: '#818CF8',
    drawerIndicator: '#FFFFFF',
    drawerIndicatorText: '#6D28D9',
    drawerAvatarBg: '#EDE9FE',
    logoutStart: '#E11D48',
    logoutEnd: '#C026D3',
    cardChip: '#F3D98B',
    cardChipLine: 'rgba(120, 90, 20, 0.35)',
    warning: '#B45309',
    warningSoft: '#FEF3C7',
  },
  dark: {
    text: '#EDE9FE',
    textSecondary: '#B3ABC7',
    textMuted: '#7A7290',
    background: '#0F0B1A',
    backgroundElement: '#1A1428',
    backgroundSelected: '#2A2140',
    border: '#2A2140',
    overlay: 'rgba(0, 0, 0, 0.65)',
    cardShadow: '0px 16px 28px -10px rgba(0, 0, 0, 0.7), 0px 4px 10px 0px rgba(0, 0, 0, 0.4)',
    tabBarShadow: '0px 10px 30px -10px rgba(0, 0, 0, 0.8)',
    fabShadow: '0px 8px 18px -4px rgba(0, 0, 0, 0.7)',
    primary: '#A78BFA',
    onPrimary: '#1C1530',
    primarySoft: '#1E1533',
    onPrimarySoft: '#C4B5FD',
    hero: '#2E1065',
    heroElement: '#4C1D95',
    onHero: '#F5F3FF',
    onHeroMuted: '#C4B5FD',
    onHeroSuccess: '#4ADE80',
    success: '#4ADE80',
    successSoft: '#14301F',
    danger: '#F87171',
    dangerSoft: '#3A1717',
    notify: '#E879F9',
    onNotify: '#1C1530',
    notifyRipple: 'rgba(232, 121, 249, 0.35)',
    notifySoft: 'rgba(232, 121, 249, 0.08)',
    backgroundMuted: '#0B0814',
    borderAccent: '#5B21B6',
    info: '#93C5FD',
    infoSoft: '#172554',
    promo: '#FDBA74',
    promoSoft: '#431407',
    scoreStart: '#A5B4FC',
    scoreEnd: '#E879F9',
    scoreGlow: '#F5D0FE',
    scoreTrack: '#2A2140',
    // Nền ngăn kéo đậm hơn ở theme tối; các màu còn lại giữ như theme sáng vì nằm trên nền tím ở cả hai theme.
    drawerStart: '#4C1D95',
    drawerMid: '#6B21A8',
    drawerEnd: '#86198F',
    drawerText: '#FFFFFF',
    drawerTextMuted: '#EDE9FE',
    drawerGlass: 'rgba(255, 255, 255, 0.14)',
    drawerGlassBorder: 'rgba(255, 255, 255, 0.24)',
    drawerIconBg: 'rgba(255, 255, 255, 0.2)',
    drawerTrack: 'rgba(28, 21, 48, 0.22)',
    drawerPositive: '#BBF7D0',
    drawerAccent: '#C026D3',
    drawerAccentAlt: '#818CF8',
    drawerIndicator: '#FFFFFF',
    drawerIndicatorText: '#6D28D9',
    drawerAvatarBg: '#EDE9FE',
    logoutStart: '#E11D48',
    logoutEnd: '#C026D3',
    cardChip: '#E5C977',
    cardChipLine: 'rgba(90, 65, 10, 0.4)',
    warning: '#FBBF24',
    warningSoft: '#3A2A0A',
  },
};

export type ThemeColor = keyof ThemeColors;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

export const Typography = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  callout: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

// Màu nhận diện của đối tác, giữ cố định ở cả giao diện sáng lẫn tối.
export const BrandColors = {
  mastercardRed: '#EB001B',
  mastercardOrange: '#F79E1B',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
