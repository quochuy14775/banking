import { CUSTOMER_API_URL, USE_MOCK_CUSTOMER } from '@/constants/api';
import {
  apiRequest,
  apiRequestBlob,
  type ApiBlob,
  type ApiProblem,
  type ApiRequestOptions,
  type ApiResult,
} from '@/shared/lib/apiClient';
import type {
  ApplicationDetail,
  ApplicationPage,
  ApplicationStatus,
  ApprovalResult,
  ReviewError,
  ReviewResult,
} from '@/models';

// Nhân viên duyệt hồ sơ đăng ký ở customer-service, cần access token của tài khoản ADMIN (auth-service cấp):
// 1. GET  /api/admin/onboarding/applications?status=&page=&size=: danh sách theo trạng thái, cũ nhất trước.
// 2. GET  .../{id}: chi tiết, có cờ nationalIdTaken và đường dẫn 3 ảnh; GET .../{id}/documents/{loại}: tải ảnh.
// 3. POST .../{id}/approve: tạo khách hàng (số CIF); POST .../{id}/reject: từ chối kèm lý do.
// Không có mock: màn quản trị chỉ dùng được khi đã cấu hình địa chỉ customer-service. Nội dung trả về có số CCCD,
// địa chỉ, số điện thoại nên không in ra log (logResponse: false); ảnh chỉ nằm trong bộ nhớ, không in, không lưu.

const BASE_PATH = '/api/admin/onboarding/applications';

export const REVIEW_PAGE_SIZE = 20;
/** Lý do từ chối tối đa 300 ký tự (RejectApplicationRequest của customer-service). */
export const REJECT_REASON_MAX_LENGTH = 300;
// Ảnh lớn hơn dữ liệu của các API khác.
const DOCUMENT_TIMEOUT_MS = 30_000;

export function listApplications(
  accessToken: string,
  status: ApplicationStatus,
  page: number,
): Promise<ReviewResult<ApplicationPage>> {
  return send(`${BASE_PATH}?status=${status}&page=${page}&size=${REVIEW_PAGE_SIZE}`, { accessToken });
}

export function getApplication(accessToken: string, applicationId: string): Promise<ReviewResult<ApplicationDetail>> {
  return send(`${BASE_PATH}/${encodeURIComponent(applicationId)}`, { accessToken });
}

export function approveApplication(accessToken: string, applicationId: string): Promise<ReviewResult<ApprovalResult>> {
  return send(`${BASE_PATH}/${encodeURIComponent(applicationId)}/approve`, { method: 'POST', accessToken });
}

/** Từ chối; trả về chi tiết hồ sơ sau khi từ chối. */
export function rejectApplication(
  accessToken: string,
  applicationId: string,
  reason: string,
): Promise<ReviewResult<ApplicationDetail>> {
  return send(`${BASE_PATH}/${encodeURIComponent(applicationId)}/reject`, {
    method: 'POST',
    accessToken,
    body: { reason },
  });
}

/** Tải một ảnh của hồ sơ theo đường dẫn trong `documentUrls` của chi tiết hồ sơ (đường dẫn tương đối của customer-service). */
export async function fetchDocument(accessToken: string, documentUrl: string): Promise<ReviewResult<ApiBlob>> {
  if (USE_MOCK_CUSTOMER) return { ok: false, error: 'notConfigured' };
  // Chỉ gửi token tới customer-service: đường dẫn phải là đường dẫn tương đối của API quản trị.
  if (!documentUrl.startsWith(`${BASE_PATH}/`)) return { ok: false, error: 'invalid' };
  const result = await apiRequestBlob(CUSTOMER_API_URL, documentUrl, { accessToken, timeoutMs: DOCUMENT_TIMEOUT_MS });
  return toReviewResult(result);
}

/** Loại ảnh (ID_FRONT, ID_BACK, PORTRAIT) là đoạn cuối của đường dẫn ảnh. */
export function documentTypeOf(documentUrl: string): string {
  return documentUrl.slice(documentUrl.lastIndexOf('/') + 1);
}

async function send<T>(path: string, options: ApiRequestOptions): Promise<ReviewResult<T>> {
  if (USE_MOCK_CUSTOMER) return { ok: false, error: 'notConfigured' };
  return toReviewResult(await apiRequest<T>(CUSTOMER_API_URL, path, { ...options, logResponse: false }));
}

function toReviewResult<T>(result: ApiResult<T>): ReviewResult<T> {
  return result.ok ? { ok: true, data: result.data } : { ok: false, error: toReviewError(result.problem) };
}

// Đổi lỗi của customer-service thành loại lỗi để màn hình chọn câu thông báo.
function toReviewError(problem: ApiProblem): ReviewError {
  if (problem.status === 0) return 'network';
  // 401 (token hết hạn, bị thu hồi) và 403 (không có vai trò ADMIN) do Spring Security trả, không có body
  // ProblemDetail nên chỉ dựa vào mã HTTP.
  if (problem.status === 401) return 'sessionExpired';
  if (problem.status === 403) return 'forbidden';
  switch (problem.code) {
    case 'CUSTOMER_NATIONAL_ID_TAKEN':
      return 'nationalIdTaken';
    case 'CUSTOMER_APPLICATION_NOT_PENDING':
      return 'notPending';
    case 'CONCURRENT_UPDATE':
      return 'concurrentUpdate';
    case 'CUSTOMER_APPLICATION_NOT_FOUND':
      return 'notFound';
    case 'VALIDATION_FAILED':
    case 'INVALID_REQUEST':
      return 'invalid';
  }
  return problem.status === 404 ? 'notFound' : 'unknown';
}
