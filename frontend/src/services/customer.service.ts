import { CUSTOMER_API_URL, USE_MOCK_CUSTOMER } from '@/constants/api';
import { apiRequest, type ApiProblem } from '@/lib/apiClient';
import type {
  ApplicationStatusResponse,
  ApplicationStatusView,
  ContactField,
  OnboardingError,
  SavedApplication,
  SubmitApplicationRequest,
  SubmitApplicationResponse,
} from '@/models';

// Đăng ký mở tài khoản với customer-service (API công khai, chưa cần đăng nhập):
// 1. POST /api/onboarding/applications: gửi thông tin CCCD (đọc từ mã QR) + 3 ảnh; nhận mã hồ sơ và mã tra cứu.
// 2. GET /api/onboarding/applications/{id} (header X-Access-Code): xem hồ sơ chờ duyệt, bị từ chối hay đã duyệt.
// Nhân viên duyệt hồ sơ ở API quản trị (bản demo dùng Postman). Đã duyệt thì tạo tài khoản đăng nhập ở auth-service.
// Có địa chỉ customer-service (EXPO_PUBLIC_CUSTOMER_API_URL) thì gọi backend thật, để trống thì dùng mock.

// Gửi 3 ảnh nên lâu hơn các API khác.
const SUBMIT_TIMEOUT_MS = 30_000;
const MOCK_DELAY_MS = 900;
const ACCESS_CODE_HEADER = 'X-Access-Code';

interface SubmitResult {
  applicationId: string;
  accessCode: string;
}

const GENDERS = { male: 'MALE', female: 'FEMALE' } as const;

export async function submitApplication(req: SubmitApplicationRequest): Promise<SubmitApplicationResponse> {
  if (USE_MOCK_CUSTOMER) return submitMock(req);

  const { info, photos } = req;
  const body = {
    nationalId: info.idNumber,
    oldIdNumber: info.oldIdNumber,
    fullName: info.fullName,
    dateOfBirth: info.dateOfBirth,
    gender: GENDERS[info.gender],
    address: info.permanentAddress,
    idIssueDate: info.issueDate,
    phone: req.phone,
    email: req.email,
    consentVersion: req.consentVersion,
    consent: true,
    idFrontImage: photos.idFront.base64,
    idBackImage: photos.idBack.base64,
    portraitImage: photos.portrait.base64,
  };
  const result = await apiRequest<SubmitResult>(CUSTOMER_API_URL, '/api/onboarding/applications', {
    method: 'POST',
    body,
    timeoutMs: SUBMIT_TIMEOUT_MS,
  });
  if (!result.ok) return { success: false, ...toFailure(result.problem) };
  return {
    success: true,
    application: { applicationId: result.data.applicationId, accessCode: result.data.accessCode, fullName: info.fullName },
  };
}

export async function getApplicationStatus(saved: SavedApplication): Promise<ApplicationStatusResponse> {
  if (USE_MOCK_CUSTOMER) return statusMock(saved);

  const result = await apiRequest<ApplicationStatusView>(
    CUSTOMER_API_URL,
    `/api/onboarding/applications/${encodeURIComponent(saved.applicationId)}`,
    { headers: { [ACCESS_CODE_HEADER]: saved.accessCode } },
  );
  if (!result.ok) {
    const { error, message } = toFailure(result.problem);
    return { success: false, error, message };
  }
  const data = result.data;
  return {
    success: true,
    view: {
      applicationId: data.applicationId,
      status: data.status,
      rejectReason: data.rejectReason ?? undefined,
      cifNumber: data.cifNumber ?? undefined,
      submittedAt: data.submittedAt,
      reviewedAt: data.reviewedAt ?? undefined,
    },
  };
}

// Đổi lỗi của customer-service (ProblemDetail, trường "code") thành loại lỗi để màn hình chọn câu thông báo.
function toFailure(problem: ApiProblem): Pick<SubmitApplicationResponse, 'error' | 'message' | 'fieldErrors'> {
  if (problem.status === 0) return { error: 'network' };
  const error = ERROR_BY_CODE[problem.code ?? ''] ?? 'unknown';
  return { error, message: problem.message, fieldErrors: pickContactFields(problem.fieldErrors) };
}

const ERROR_BY_CODE: Record<string, OnboardingError> = {
  CUSTOMER_APPLICATION_NOT_FOUND: 'notFound',
  // Dữ liệu bị từ chối: chưa đủ tuổi, số CCCD không khớp ngày sinh, ảnh không phải JPEG/PNG...
  INVALID_REQUEST: 'invalid',
  VALIDATION_FAILED: 'invalid',
};

function pickContactFields(errors: Record<string, string> | undefined): SubmitApplicationResponse['fieldErrors'] {
  if (!errors) return undefined;
  const fields: ContactField[] = ['phone', 'email'];
  const picked = Object.fromEntries(fields.filter((field) => errors[field]).map((field) => [field, errors[field]]));
  return Object.keys(picked).length > 0 ? picked : undefined;
}

// ---------------------------------------------------------------- mock

// Mock giữ hồ sơ trong bộ nhớ (mất khi tải lại app). Không có nhân viên duyệt nên hồ sơ mock tự được duyệt sau
// vài giây, để chạy thử được trọn luồng khi không có backend.
const MOCK_AUTO_APPROVE_MS = 5_000;
const mockApplications = new Map<string, { accessCode: string; submittedAt: number; cifNumber: string }>();

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function submitMock(req: SubmitApplicationRequest): Promise<SubmitApplicationResponse> {
  await delay(MOCK_DELAY_MS);
  const applicationId = `mock-${Date.now()}`;
  const accessCode = `mock-code-${Math.random().toString(36).slice(2)}`;
  const cifNumber = String(mockApplications.size + 1).padStart(10, '0');
  mockApplications.set(applicationId, { accessCode, submittedAt: Date.now(), cifNumber });
  return { success: true, application: { applicationId, accessCode, fullName: req.info.fullName } };
}

async function statusMock(saved: SavedApplication): Promise<ApplicationStatusResponse> {
  await delay(MOCK_DELAY_MS);
  const application = mockApplications.get(saved.applicationId);
  if (!application || application.accessCode !== saved.accessCode) return { success: false, error: 'notFound' };
  const approved = Date.now() - application.submittedAt >= MOCK_AUTO_APPROVE_MS;
  return {
    success: true,
    view: {
      applicationId: saved.applicationId,
      status: approved ? 'APPROVED' : 'PENDING_REVIEW',
      cifNumber: approved ? application.cifNumber : undefined,
      submittedAt: new Date(application.submittedAt).toISOString(),
    },
  };
}
