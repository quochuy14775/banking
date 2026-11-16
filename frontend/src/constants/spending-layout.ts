// Số đo của khối "Tiền đi đâu" (kiểu thanh xếp tầng) trên Home. Đổi số ở đây là đủ.
// Lấy từ cấu hình người dùng chọn trong bản thử thiết kế:
// {"variant":"stack","palette":"mono","compare":"pct","switcher":"segment","cardPad":16,"rowGap":8,"barH":4,
//  "nameSize":14,"amountSize":14,"totalSize":26,"icons":"glyph","budget":"on"}

const ROW_GAP = 8;
const BAR_H = 4;

export const SpendingLayout = {
  /** Cỡ chữ tổng chi (số mono lớn dưới tiêu đề). */
  totalSize: 26,
  /** Thanh xếp tầng: cao = max(barH × 2, 8), khe giữa các đoạn 2. */
  stackHeight: Math.max(BAR_H * 2, 8),
  stackGap: 2,
  stackRadius: BAR_H,
  /** Padding dọc mỗi dòng danh mục = rowGap / 2 + 2. */
  rowPadY: ROW_GAP / 2 + 2,
  /** Icon kiểu nét trần (không ô nền), tô theo màu đoạn thanh của danh mục. */
  glyphBox: 22,
  glyphSize: 17,
  iconGap: 10,
  nameSize: 14,
  amountSize: 14,
  /** Bề rộng tối thiểu của cột số tiền và cột % thay đổi, để các dòng thẳng cột. */
  amountMinWidth: 48,
  changeWidth: 46,
} as const;
