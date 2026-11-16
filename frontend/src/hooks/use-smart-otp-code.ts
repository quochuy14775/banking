import { useI18n } from '@/i18n';
import { pinFailureMessage, useSmartOtp } from '@/lib/smartOtpStore';

// Để riêng khỏi smartOtpStore: store không phụ thuộc i18n, nên sửa file dịch lúc dev (Fast Refresh) không tạo lại
// context của SmartOtpProvider.

/** Dùng ở bước xác thực giao dịch: đổi mã PIN thành mã Smart OTP, hoặc trả câu báo lỗi đã dịch. */
export function useSmartOtpCode() {
  const { generateCode } = useSmartOtp();
  const { t } = useI18n();
  return async (pin: string): Promise<{ code: string } | { error: string }> => {
    const res = await generateCode(pin);
    return res.ok ? { code: res.code } : { error: pinFailureMessage(res, t) };
  };
}
