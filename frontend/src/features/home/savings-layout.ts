// Số đo của khối "Mục tiêu tiết kiệm" (kiểu thẻ tích tháng) trên Home. Đổi số ở đây là đủ.
// Lấy từ cấu hình người dùng chọn trong bản thử thiết kế:
// {"variant":"stamps","cta":"chips","status":"chip","icon":"glyph","cardPad":16,"rowGap":22,"barH":10,
//  "stampGap":4,"nameSize":16,"amountSize":14}

const ROW_GAP = 22;
const BAR_H = 10;

export const SavingsLayout = {
  /** Padding dọc mỗi mục tiêu = rowGap / 2; giữa hai mục có đường kẻ mảnh. */
  goalPadY: ROW_GAP / 2,
  /** Ô tháng: cao = max(barH × 2, 14), khe giữa các ô, bo góc. */
  stampHeight: Math.max(BAR_H * 2, 14),
  stampGap: 4,
  stampRadius: 4,
  /** Viền đánh dấu ô của tháng hiện tại. */
  stampCurrentBorder: 1.5,
  /** Độ đậm phần đã góp của ô đang góp dở. */
  stampPartialOpacity: 0.45,
  /** Icon kiểu nét trần (không ô nền). */
  glyphBox: 22,
  glyphSize: 19,
  iconGap: 10,
  nameSize: 16,
  amountSize: 14,
  /** Các mức góp nhanh (₫); nút cuối luôn là "Đủ tháng" = số cần góp tháng này. */
  quickAmounts: [500_000, 1_000_000, 2_000_000] as const,
} as const;
