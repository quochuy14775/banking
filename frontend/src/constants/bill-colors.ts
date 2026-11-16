import type { BillCategory } from '@/models';

export type BillTileCategory = BillCategory | 'other';

export interface BillCategoryColor {
  /** Nền ô icon. */
  bg: string;
  /** Màu icon/chữ trên nền `bg`. */
  fg: string;
  /** Chấm trên lịch và dòng thời gian. */
  dot: string;
}

// Mỗi loại dịch vụ một màu để nhìn là nhận ra: điện vàng, nước xanh dương, internet xanh ngọc...
export const BillCategoryColors: Record<BillTileCategory, { light: BillCategoryColor; dark: BillCategoryColor }> = {
  electricity: {
    light: { bg: '#FEF3C7', fg: '#B45309', dot: '#F59E0B' },
    dark: { bg: '#3A2A0A', fg: '#FBBF24', dot: '#F59E0B' },
  },
  water: {
    light: { bg: '#E0F2FE', fg: '#0369A1', dot: '#0EA5E9' },
    dark: { bg: '#0C2A3F', fg: '#7DD3FC', dot: '#38BDF8' },
  },
  internet: {
    light: { bg: '#DDF3EE', fg: '#0F766E', dot: '#14B8A6' },
    dark: { bg: '#0E2A27', fg: '#5EEAD4', dot: '#2DD4BF' },
  },
  tv: {
    light: { bg: '#FEE2E2', fg: '#B91C1C', dot: '#EF4444' },
    dark: { bg: '#3A1717', fg: '#FCA5A5', dot: '#F87171' },
  },
  mobile: {
    light: { bg: '#DCFCE7', fg: '#15803D', dot: '#22C55E' },
    dark: { bg: '#14301F', fg: '#86EFAC', dot: '#4ADE80' },
  },
  tuition: {
    light: { bg: '#FFEDD5', fg: '#C2410C', dot: '#F97316' },
    dark: { bg: '#431407', fg: '#FDBA74', dot: '#FB923C' },
  },
  insurance: {
    light: { bg: '#FCE7F3', fg: '#BE185D', dot: '#EC4899' },
    dark: { bg: '#3B0A24', fg: '#F9A8D4', dot: '#F472B6' },
  },
  other: {
    light: { bg: '#F1F5F9', fg: '#475569', dot: '#94A3B8' },
    dark: { bg: '#1E293B', fg: '#CBD5E1', dot: '#94A3B8' },
  },
};
