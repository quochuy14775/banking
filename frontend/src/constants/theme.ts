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
  /** Nền phần tử nằm trong card (vd vé hóa đơn); ở theme tối sáng hơn card để vẫn tách lớp. */
  backgroundInset: string;
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

// Bảng màu "xanh rêu": một màu thương hiệu xanh lá đậm, nền trung tính hơi ấm, điểm nhấn vàng đồng/cam.
// Theme tối theo hướng dẫn Material: nền gần đen pha chút xanh (không đen tuyệt đối), mặt nổi sáng dần theo độ cao,
// màu thương hiệu chuyển sang tông xanh bạc hà sáng, giảm độ bão hoà để không chói và đạt tương phản ≥ 4.5:1.
export const Colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    text: '#14211C',
    textSecondary: '#4E5D56',
    textMuted: '#69766F',
    background: '#F6F7F4',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#E2F0E8',
    border: '#E1E6E1',
    overlay: 'rgba(10, 24, 19, 0.6)',
    cardShadow: '0px 12px 24px -12px rgba(11, 58, 46, 0.35), 0px 2px 6px 0px rgba(20, 33, 28, 0.08)',
    tabBarShadow: '0px 10px 30px -12px rgba(20, 33, 28, 0.25), 0px 2px 8px 0px rgba(20, 33, 28, 0.06)',
    fabShadow: '0px 6px 14px -4px rgba(11, 58, 46, 0.4)',
    primary: '#0F6B4F',
    onPrimary: '#FFFFFF',
    primarySoft: '#E2F0E8',
    onPrimarySoft: '#0B5540',
    hero: '#0F4D3C',
    heroElement: '#0B3A2E',
    onHero: '#F1F7F3',
    onHeroMuted: '#A9CBBB',
    onHeroSuccess: '#9BE6BC',
    success: '#15803D',
    successSoft: '#DCF5E4',
    danger: '#DC2626',
    dangerSoft: '#FDE8E8',
    notify: '#D9480F',
    onNotify: '#FFFFFF',
    notifyRipple: 'rgba(217, 72, 15, 0.35)',
    notifySoft: 'rgba(255, 237, 226, 0.7)',
    backgroundMuted: '#EEF2EE',
    backgroundInset: '#EEF2EE',
    borderAccent: '#9FD3BC',
    info: '#1E40AF',
    infoSoft: '#DBEAFE',
    promo: '#9A3412',
    promoSoft: '#FFEDD5',
    scoreStart: '#34A77A',
    scoreEnd: '#0F6B4F',
    scoreGlow: '#C9EBDB',
    scoreTrack: '#ECF1ED',
    drawerStart: '#0B4A39',
    drawerMid: '#0F5E48',
    drawerEnd: '#137258',
    drawerText: '#FFFFFF',
    drawerTextMuted: '#D3EADF',
    drawerGlass: 'rgba(255, 255, 255, 0.12)',
    drawerGlassBorder: 'rgba(255, 255, 255, 0.22)',
    drawerIconBg: 'rgba(255, 255, 255, 0.18)',
    drawerTrack: 'rgba(5, 25, 19, 0.28)',
    drawerPositive: '#BBF7D0',
    drawerAccent: '#E3B566',
    drawerAccentAlt: '#6FCF97',
    drawerIndicator: '#FFFFFF',
    drawerIndicatorText: '#0F6B4F',
    drawerAvatarBg: '#E2F0E8',
    logoutStart: '#DC2626',
    logoutEnd: '#B91C1C',
    cardChip: '#E8C77A',
    cardChipLine: 'rgba(120, 90, 20, 0.35)',
    warning: '#B45309',
    warningSoft: '#FEF3C7',
  },
  dark: {
    text: '#E4EEE9',
    textSecondary: '#A7B7AF',
    textMuted: '#7F8F87',
    background: '#0C1210',
    backgroundElement: '#151D1A',
    backgroundSelected: '#1E2A25',
    border: '#23302A',
    overlay: 'rgba(0, 0, 0, 0.65)',
    cardShadow: '0px 16px 28px -10px rgba(0, 0, 0, 0.7), 0px 4px 10px 0px rgba(0, 0, 0, 0.4)',
    tabBarShadow: '0px 10px 30px -10px rgba(0, 0, 0, 0.8)',
    fabShadow: '0px 8px 18px -4px rgba(0, 0, 0, 0.7)',
    primary: '#6EDBA8',
    onPrimary: '#03291C',
    primarySoft: '#12261E',
    onPrimarySoft: '#93E6BF',
    hero: '#14443A',
    heroElement: '#0E3129',
    onHero: '#EAF5EF',
    onHeroMuted: '#9DC5B3',
    onHeroSuccess: '#6EE7A8',
    success: '#4ADE80',
    successSoft: '#12301F',
    danger: '#F87171',
    dangerSoft: '#3A1717',
    notify: '#FF8A5B',
    onNotify: '#2A0F05',
    notifyRipple: 'rgba(255, 138, 91, 0.35)',
    notifySoft: 'rgba(255, 138, 91, 0.08)',
    backgroundMuted: '#090E0C',
    backgroundInset: '#1E2A25',
    borderAccent: '#1F6B50',
    info: '#93C5FD',
    infoSoft: '#172554',
    promo: '#FDBA74',
    promoSoft: '#431407',
    scoreStart: '#93E6BF',
    scoreEnd: '#3CC48A',
    scoreGlow: '#C8F3DD',
    scoreTrack: '#1E2A25',
    // Nền ngăn kéo đậm hơn ở theme tối; các màu còn lại giữ như theme sáng vì nằm trên nền xanh đậm ở cả hai theme.
    drawerStart: '#082A21',
    drawerMid: '#0C382C',
    drawerEnd: '#104A3A',
    drawerText: '#FFFFFF',
    drawerTextMuted: '#D3EADF',
    drawerGlass: 'rgba(255, 255, 255, 0.1)',
    drawerGlassBorder: 'rgba(255, 255, 255, 0.18)',
    drawerIconBg: 'rgba(255, 255, 255, 0.14)',
    drawerTrack: 'rgba(0, 0, 0, 0.3)',
    drawerPositive: '#BBF7D0',
    drawerAccent: '#E3B566',
    drawerAccentAlt: '#6FCF97',
    drawerIndicator: '#FFFFFF',
    drawerIndicatorText: '#0F6B4F',
    drawerAvatarBg: '#E2F0E8',
    logoutStart: '#DC2626',
    logoutEnd: '#B91C1C',
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

/**
 * Thang cỡ icon cho `SymbolView size`: chọn bậc gần nhất thay vì số lẻ. Hình minh họa rất lớn (khung camera,
 * khuôn mặt 88–96px) giữ cỡ riêng tại chỗ.
 */
export const IconSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  hero: 32,
  badge: 36,
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

/**
 * Font cho mọi số tiền đứng riêng (số dư, tổng tiền, số tiền từng dòng): mono để các chữ số rộng bằng nhau
 * và thẳng cột khi xếp dọc. Số tiền nằm giữa câu văn thì giữ font thường để câu không bị lệch font.
 */
export const MoneyText = { fontFamily: Fonts.mono, fontVariant: ['tabular-nums'] } as const satisfies TextStyle;

// Màu nhận diện của đối tác, giữ cố định ở cả giao diện sáng lẫn tối.
export const BrandColors = {
  mastercardRed: '#EB001B',
  mastercardOrange: '#F79E1B',
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
