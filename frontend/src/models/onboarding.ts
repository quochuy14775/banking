import type { CccdInfo } from './kyc';

/** Trạng thái hồ sơ đăng ký, đúng như customer-service trả về. */
export type ApplicationStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

/** Loại ảnh kèm hồ sơ, theo thứ tự chụp. */
export type DocumentKind = 'idFront' | 'idBack' | 'portrait';

/** Ảnh đã thu nhỏ, sẵn sàng gửi: JPEG dạng base64 (không có tiền tố data:) và đường dẫn để xem lại trên máy. */
export interface CapturedPhoto {
  base64: string;
  uri: string;
}

export type ApplicationPhotos = Record<DocumentKind, CapturedPhoto>;

export interface SubmitApplicationRequest {
  /** Thông tin đọc từ mã QR trên CCCD. */
  info: CccdInfo;
  /** Chỉ là thông tin liên hệ, không dùng để xác thực. */
  phone?: string;
  email?: string;
  /** Phiên bản văn bản đồng ý xử lý dữ liệu cá nhân mà khách đã đọc. */
  consentVersion: string;
  photos: ApplicationPhotos;
}

/**
 * Hồ sơ đã gửi mà app giữ trên máy (expo-secure-store) để xem trạng thái và tạo tài khoản đăng nhập sau khi được duyệt.
 * `accessCode` là mã tra cứu server chỉ trả một lần.
 */
export interface SavedApplication {
  applicationId: string;
  accessCode: string;
  fullName: string;
}

/** Trạng thái hồ sơ khách xem được. */
export interface ApplicationStatusView {
  applicationId: string;
  status: ApplicationStatus;
  /** Lý do nhân viên từ chối, khi `status` là REJECTED. */
  rejectReason?: string;
  /** Số CIF, khi `status` là APPROVED. */
  cifNumber?: string;
  submittedAt: string;
  reviewedAt?: string;
}

/** Loại lỗi khi gọi customer-service; màn hình dựa vào đây để chọn câu thông báo. */
export type OnboardingError = 'notFound' | 'invalid' | 'network' | 'unknown';

export type ContactField = 'phone' | 'email';

export interface SubmitApplicationResponse {
  success: boolean;
  application?: SavedApplication;
  error?: OnboardingError;
  /** Câu thông báo backend trả về (nếu có), ví dụ lý do dữ liệu bị từ chối. */
  message?: string;
  fieldErrors?: Partial<Record<ContactField, string>>;
}

export interface ApplicationStatusResponse {
  success: boolean;
  view?: ApplicationStatusView;
  error?: OnboardingError;
  message?: string;
}
