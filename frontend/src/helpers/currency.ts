import type { TransactionType } from '@/models';

export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + ' ₫';
}

export function formatSignedVND(amount: number, type: TransactionType): string {
  return `${type === 'in' ? '+' : '-'}${formatVND(amount)}`;
}
