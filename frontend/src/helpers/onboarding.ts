import type { Translate } from '@/i18n';
import type { OnboardingError } from '@/models';

// Quy tắc SĐT và email liên hệ, theo CustomerRules của customer-service để báo lỗi ngay khi nhập.
// Backend vẫn kiểm tra lại; khi đổi quy tắc ở backend thì phải đổi cả ở đây.

export const CONTACT_PHONE_MAX_LENGTH = 20;
export const CONTACT_EMAIL_MAX_LENGTH = 100;

const PHONE_PATTERN = /^\+?[0-9]{9,15}$/;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Ô để trống là hợp lệ vì SĐT và email đều không bắt buộc. */
export function isValidContactPhone(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || PHONE_PATTERN.test(trimmed);
}

export function isValidContactEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed === '' || EMAIL_PATTERN.test(trimmed);
}

/**
 * Câu báo lỗi khi gọi customer-service. Dữ liệu bị từ chối thì dùng câu backend trả về vì nó nói rõ lý do
 * (chưa đủ 18 tuổi, số CCCD không khớp ngày sinh, ảnh sai định dạng...); các lỗi còn lại dùng câu của app.
 */
export function onboardingErrorText(t: Translate, error: OnboardingError = 'unknown', message?: string): string {
  switch (error) {
    case 'notFound':
      return t('onboarding.errors.notFound');
    case 'invalid':
      return message ?? t('onboarding.errors.invalid');
    case 'network':
      return t('onboarding.errors.network');
    default:
      return message ?? t('onboarding.errors.unknown');
  }
}
