import type { TransactionType } from '@/models';

// Mọi số tiền hiển thị đi qua các hàm trong file này, không tự gọi toLocaleString hay tự ghép dấu +/-.
// Tiền VND luôn viết kiểu Việt Nam (dấu chấm ngăn nghìn) kể cả khi app ở tiếng Anh, vì đơn vị là đồng.
// Dấu trừ dùng ký tự trừ thật "−" (U+2212), rộng bằng dấu "+" nên các cột số tiền thẳng hàng.
export const MINUS_SIGN = '−';

/** Chỉ phần số, không kèm ₫: `45.230.000`. Dùng cho ô nhập số tiền, nút gợi ý số tiền, cột tiền trong bảng. */
export function formatNumberVND(amount: number): string {
  return `${amount < 0 ? MINUS_SIGN : ''}${Math.abs(amount).toLocaleString('vi-VN')}`;
}

/** `45.230.000 ₫` */
export function formatVND(amount: number): string {
  return `${formatNumberVND(amount)} ₫`;
}

/** Số tiền giao dịch có dấu theo chiều tiền: `+2.500.000 ₫` / `−850.000 ₫`. */
export function formatSignedVND(amount: number, type: TransactionType): string {
  return `${type === 'in' ? '+' : MINUS_SIGN}${formatVND(Math.abs(amount))}`;
}

/** Số tiền rút gọn theo triệu/nghìn: `5,4tr`, `820k` (vi) hoặc `5.4M`, `820K` (en). */
export function formatCompactVND(amount: number, locale: string): string {
  const vi = locale.startsWith('vi');
  const abs = Math.abs(amount);
  const sign = amount < 0 ? MINUS_SIGN : '';
  if (abs >= 1_000_000) {
    const value = (abs / 1_000_000).toLocaleString(locale, { maximumFractionDigits: abs >= 100_000_000 ? 0 : 1 });
    return `${sign}${value}${vi ? 'tr' : 'M'}`;
  }
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}${vi ? 'k' : 'K'}`;
  return `${sign}${abs}`;
}
