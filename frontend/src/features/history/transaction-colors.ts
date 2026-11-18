import type { TransactionCategory } from '@/models';

// Mỗi loại giao dịch một màu (tông giữa, đọc được trên nền sáng lẫn tối) cho chấm/vòng đánh dấu ở danh sách lịch sử.
export const TransactionCategoryColors: Record<TransactionCategory, string> = {
  transfer: '#14B8A6',
  bill: '#F59E0B',
  salary: '#22C55E',
  payment: '#8B5CF6',
  topup: '#0EA5E9',
  cash: '#F97316',
  interest: '#84CC16',
  savings: '#3B82F6',
};
