// Số đo của khối "Sắp đến hạn" (kiểu vé xé, gộp trong một card) trên Home.
// Đổi số ở đây là đủ, component đọc lại toàn bộ.

const ICON_SIZE = 40;

export const UpcomingLayout = {
  /** Số vé tối đa hiện trên Home; phần còn lại gom vào dòng "+N hóa đơn khác". */
  maxTickets: 3,
  /** Cỡ gốc của icon; cuống vé và icon trong vé tính theo số này. */
  iconSize: ICON_SIZE,
  /** Bo góc mỗi vé (nhỏ hơn card ngoài 24 để lồng vào cho cân). */
  ticketRadius: 14,
  /** Khoảng cách dọc giữa hai vé. */
  ticketGap: 8,
  /** Padding dọc của nội dung trong vé. */
  rowPad: 8,
  /** Padding ngang của phần nội dung bên phải cuống. */
  bodyPadX: 12,
  /** Khoảng cách icon – chữ. */
  iconGap: 10,
  /** Cuống vé: rộng = iconSize + 22. */
  stubWidth: ICON_SIZE + 22,
  stubDaySize: 18,
  /** Icon kiểu "nét trần": không ô nền, chỉ tô màu theo loại dịch vụ. */
  glyphBox: 21,
  glyphSize: 18,
  /** Đường kính khấc tròn ở hai đầu đường xé. */
  notch: 14,
  /** Số gạch của đường xé dọc. */
  perforationDashes: 6,
  titleSize: 14,
  amountSize: 15,
  summaryAmountSize: 15,
  /** Thanh "trả gộp": cỡ vòng icon hóa đơn chồng lên nhau và độ chồng. */
  payAvatar: 30,
  payAvatarOverlap: 10,
  payAmountSize: 17,
} as const;
