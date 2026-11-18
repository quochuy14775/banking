import type { ApplicationStatus } from './onboarding';

// Dữ liệu của API duyệt hồ sơ đăng ký (customer-service, /api/admin/onboarding/applications), đúng như backend trả về.

/** Một dòng trong danh sách hồ sơ của nhân viên. */
export interface ApplicationSummary {
  id: string;
  fullName: string;
  nationalId: string;
  /** Ngày ISO `YYYY-MM-DD`. */
  dateOfBirth: string;
  status: ApplicationStatus;
  /** Thời điểm ISO, ví dụ `2026-11-17T09:12:03.884334Z`. */
  submittedAt: string;
}

export interface ApplicationPage {
  items: ApplicationSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export type ApplicantGender = 'MALE' | 'FEMALE';

/** Chi tiết hồ sơ cho nhân viên duyệt. Trường không có giá trị thì backend trả `null`. */
export interface ApplicationDetail {
  id: string;
  nationalId: string;
  oldIdNumber: string | null;
  fullName: string;
  dateOfBirth: string;
  gender: ApplicantGender;
  address: string;
  idIssueDate: string | null;
  phone: string | null;
  email: string | null;
  status: ApplicationStatus;
  rejectReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  /** Khách hàng tạo ra khi duyệt. */
  customerId: string | null;
  submittedAt: string;
  /** true nếu hồ sơ còn chờ duyệt mà số CCCD đã có khách hàng: bấm duyệt sẽ bị báo trùng (409). */
  nationalIdTaken: boolean;
  /** Đường dẫn tải từng ảnh (cần header Authorization), kết thúc bằng loại ảnh: ID_FRONT, ID_BACK, PORTRAIT. */
  documentUrls: string[];
}

/** Kết quả duyệt: khách hàng vừa tạo. */
export interface ApprovalResult {
  applicationId: string;
  status: ApplicationStatus;
  customerId: string;
  cifNumber: string;
}

/** Loại lỗi khi gọi API duyệt hồ sơ; màn hình dựa vào đây để chọn câu thông báo. */
export type ReviewError =
  | 'sessionExpired'
  | 'forbidden'
  | 'notFound'
  | 'nationalIdTaken'
  | 'notPending'
  | 'concurrentUpdate'
  | 'invalid'
  | 'network'
  | 'notConfigured'
  | 'unknown';

export type ReviewResult<T> = { ok: true; data: T } | { ok: false; error: ReviewError };
