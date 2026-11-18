import type { SavingsGoalIcon } from '@/models';

export const SavingsGoalColors: Record<SavingsGoalIcon, { light: { bg: string; fg: string }; dark: { bg: string; fg: string } }> = {
  travel: { light: { bg: '#E0F2FE', fg: '#0369A1' }, dark: { bg: '#0C2A3F', fg: '#7DD3FC' } },
  emergency: { light: { bg: '#E2F0E8', fg: '#0F6B4F' }, dark: { bg: '#12261E', fg: '#93E6BF' } },
  home: { light: { bg: '#DCFCE7', fg: '#15803D' }, dark: { bg: '#14301F', fg: '#86EFAC' } },
  education: { light: { bg: '#FEF3C7', fg: '#B45309' }, dark: { bg: '#3A2A0A', fg: '#FBBF24' } },
};

/**
 * Dải "một tông xanh" cho khối Tiền đi đâu: danh mục chi nhiều nhất đậm nhất, nhạt dần theo thứ hạng.
 * Đầu nhạt vẫn giữ đủ đậm để icon nét trần cùng màu còn nhìn thấy trên nền card.
 */
export const SpendingRamp: { light: readonly string[]; dark: readonly string[] } = {
  light: ['#0B4A39', '#137258', '#2F9A70', '#5BB38B', '#8CC5AA'],
  dark: ['#A6EDCB', '#6FD3A5', '#46B282', '#33916A', '#5E8574'],
};
