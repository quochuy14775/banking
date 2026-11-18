import type { ThemeColors } from '@/constants/theme';
import type { Translate, TranslationKey } from '@/i18n';
import type { ApplicationStatus, ReviewError } from '@/models';

const REVIEW_ERRORS: Record<ReviewError, TranslationKey> = {
  sessionExpired: 'admin.errors.sessionExpired',
  forbidden: 'admin.errors.forbidden',
  notFound: 'admin.errors.notFound',
  nationalIdTaken: 'admin.errors.nationalIdTaken',
  notPending: 'admin.errors.notPending',
  concurrentUpdate: 'admin.errors.concurrentUpdate',
  invalid: 'admin.errors.invalid',
  network: 'admin.errors.network',
  notConfigured: 'admin.errors.notConfigured',
  unknown: 'admin.errors.unknown',
};

/**
 * Câu báo lỗi khi gọi API duyệt hồ sơ. Mất mạng lúc duyệt hoặc từ chối thì không biết máy chủ đã làm hay chưa,
 * nên nhắc tải lại hồ sơ để kiểm tra trước khi thử lại.
 */
export function reviewErrorText(t: Translate, error: ReviewError, during: 'load' | 'action' = 'load'): string {
  if (error === 'network' && during === 'action') return t('admin.errors.actionNetwork');
  return t(REVIEW_ERRORS[error]);
}

/** Màu nhãn trạng thái hồ sơ, cùng màu với màn trạng thái hồ sơ của khách. */
export function statusColors(theme: ThemeColors, status: ApplicationStatus): { color: string; background: string } {
  switch (status) {
    case 'APPROVED':
      return { color: theme.success, background: theme.successSoft };
    case 'REJECTED':
      return { color: theme.danger, background: theme.dangerSoft };
    default:
      return { color: theme.info, background: theme.infoSoft };
  }
}

/** Thứ tự tab trạng thái ở màn danh sách. */
export const REVIEW_STATUSES = ['PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const satisfies readonly ApplicationStatus[];

/** Tên ảnh theo loại (đoạn cuối đường dẫn ảnh); loại lạ thì hiện nguyên tên loại. */
export function documentLabel(t: Translate, type: string): string {
  switch (type) {
    case 'ID_FRONT':
      return t('admin.photos.ID_FRONT');
    case 'ID_BACK':
      return t('admin.photos.ID_BACK');
    case 'PORTRAIT':
      return t('admin.photos.PORTRAIT');
    default:
      return type;
  }
}
