// Chuyển động lặp đặc trưng trên Home: mỗi section một component, chậm, biên độ nhỏ, phần lớn chu kỳ đứng yên.
// Lấy từ cấu hình người dùng chọn trong bản demo: {"loops":["card","spend","insight","health"],"speed":1.1,"intensity":1}

/** > 1 là nhanh hơn: thời lượng chu kỳ = gốc / speed. */
const SPEED = 1.1;
/** Hệ số biên độ (độ phóng to, độ sáng). */
export const LOOP_INTENSITY = 1;

const cycle = (baseMs: number) => Math.round(baseMs / SPEED);

export const AmbientLoops = {
  /** Thẻ số dư: 3 vòng sóng không chạm sáng lần lượt. */
  nfc: { cycle: cycle(3200), stagger: Math.round(250 / SPEED), restOpacity: 0.3 },
  /** Tiền đi đâu: chấm "hôm nay" ở đầu thanh ngân sách thở nhẹ. */
  budgetDot: { cycle: cycle(2800), maxScale: 1 + 0.9 * LOOP_INTENSITY, startOpacity: 0.5 },
  /** Gợi ý: quầng sáng sau bóng đèn sáng lên rồi dịu xuống. */
  bulb: { cycle: cycle(4000), minOpacity: 0.12, maxOpacity: 0.25 + 0.4 * LOOP_INTENSITY },
  /** Sức khỏe tài chính: chấm cuối vòng điểm đập hai nhịp rồi nghỉ. */
  heartbeat: { cycle: cycle(4000), firstBeat: 1 * LOOP_INTENSITY, secondBeat: 0.7 * LOOP_INTENSITY },
} as const;
