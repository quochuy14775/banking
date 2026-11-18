import AsyncStorage from '@react-native-async-storage/async-storage';

import { AUTH_API_URL, USE_MOCK_AUTH } from '@/constants/api';
import { normalizeUsername } from '@/helpers';
import { apiRequest, type ApiProblem } from '@/lib/apiClient';
import { mockUser } from '@/lib/mockData';
import type {
  FaceIdLoginRequest,
  LoginRequest,
  LoginResponse,
  RegisterField,
  RegisteredUser,
  RegisterRequest,
  RegisterResponse,
  RememberedUser,
  User,
} from '@/models';
import { withKycProfile } from '@/services/kyc.service';

const MOCK_DELAY_MS = 600;
// Nhớ người dùng đã đăng nhập trên máy (chỉ thông tin hiển thị, không lưu mật khẩu) để lần sau
// chỉ cần nhập mật khẩu hoặc quét Face ID. Khi có BE, token phiên nên nằm trong expo-secure-store.
const REMEMBERED_USER_KEY = 'vietbank.rememberedUser.v1';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function rememberUser(user: User): Promise<void> {
  const remembered: RememberedUser = {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
  };
  await AsyncStorage.setItem(REMEMBERED_USER_KEY, JSON.stringify(remembered)).catch(() => {});
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const username = req.username.trim();
  if (!username || !req.password) {
    return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' };
  }
  await delay(MOCK_DELAY_MS);
  const user = withKycProfile({ ...mockUser, username });
  await rememberUser(user);
  return { success: true, token: 'mock-token', user };
}

// Khi có BE: Face ID mở khoá token/khoá bí mật lưu an toàn trên máy rồi gửi lên server, không gửi tên trần.
export async function loginWithFaceId(req: FaceIdLoginRequest): Promise<LoginResponse> {
  if (!req.username) return { success: false, message: 'Chưa có tài khoản đăng nhập trên máy này.' };
  await delay(MOCK_DELAY_MS);
  return { success: true, token: 'mock-token', user: withKycProfile({ ...mockUser, username: req.username }) };
}

/**
 * Đăng ký tài khoản đăng nhập cho khách có hồ sơ đăng ký đã được duyệt. Có địa chỉ auth-service
 * (EXPO_PUBLIC_AUTH_API_URL) thì gọi backend thật, không có thì dùng mock. Màn hình đã kiểm tra định dạng trước;
 * ở đây chủ yếu xử lý kết quả từ backend.
 */
export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  const body: RegisterRequest = { ...req, username: normalizeUsername(req.username) };
  if (USE_MOCK_AUTH) return registerMock(body);

  const result = await apiRequest<RegisteredUser>(AUTH_API_URL, '/api/auth/register', { method: 'POST', body });
  if (result.ok) return { success: true, user: result.data };
  return toRegisterFailure(result.problem);
}

// Đổi lỗi của auth-service thành lỗi hiện trên form: lỗi gắn với một ô thì hiện dưới ô đó.
function toRegisterFailure(problem: ApiProblem): RegisterResponse {
  if (problem.status === 0) {
    return { success: false, message: 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.' };
  }
  switch (problem.code) {
    case 'AUTH_USERNAME_TAKEN':
      return { success: false, fieldErrors: { username: problem.message ?? 'Tên đăng nhập đã được sử dụng.' } };
    case 'AUTH_WEAK_PASSWORD':
      return { success: false, fieldErrors: { password: problem.message ?? 'Mật khẩu chưa đạt yêu cầu.' } };
    // Hồ sơ đăng ký chưa duyệt, sai mã hồ sơ, hoặc khách đã có tài khoản: hiện câu của backend dưới form.
    case 'AUTH_ONBOARDING_NOT_APPROVED':
    case 'AUTH_ONBOARDING_NOT_FOUND':
    case 'AUTH_CUSTOMER_HAS_LOGIN':
      return { success: false, message: problem.message ?? 'Chưa tạo được tài khoản cho hồ sơ này.' };
    case 'VALIDATION_FAILED':
      return { success: false, message: problem.message, fieldErrors: pickRegisterFields(problem.fieldErrors) };
    default:
      return { success: false, message: problem.message ?? 'Đăng ký thất bại, vui lòng thử lại.' };
  }
}

function pickRegisterFields(errors: Record<string, string> | undefined): RegisterResponse['fieldErrors'] {
  if (!errors) return undefined;
  const fields: RegisterField[] = ['username', 'password'];
  return Object.fromEntries(fields.filter((field) => errors[field]).map((field) => [field, errors[field]]));
}

// Mock: tên của người dùng demo và các tên vừa đăng ký trong phiên này coi như đã có người dùng.
const mockTakenUsernames = new Set([normalizeUsername(mockUser.username)]);

async function registerMock(req: RegisterRequest): Promise<RegisterResponse> {
  await delay(MOCK_DELAY_MS);
  if (mockTakenUsernames.has(req.username)) {
    return { success: false, fieldErrors: { username: 'Tên đăng nhập đã được sử dụng.' } };
  }
  mockTakenUsernames.add(req.username);
  return { success: true, user: { id: `mock-${Date.now()}`, username: req.username, roles: ['CUSTOMER'] } };
}

export async function getRememberedUser(): Promise<RememberedUser | null> {
  try {
    const raw = await AsyncStorage.getItem(REMEMBERED_USER_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<RememberedUser>;
    if (!value.id || !value.username || !value.fullName) return null;
    return { id: value.id, username: value.username, fullName: value.fullName, avatarUrl: value.avatarUrl };
  } catch {
    return null;
  }
}

/** "Không phải bạn?": quên người dùng trên máy, lần sau phải nhập lại tên đăng nhập. */
export async function forgetRememberedUser(): Promise<void> {
  await AsyncStorage.removeItem(REMEMBERED_USER_KEY).catch(() => {});
}

// Chưa đăng xuất (chỉ tắt app) thì vẫn nhớ người dùng: lần sau chỉ cần mật khẩu hoặc Face ID.
// Chủ động đăng xuất thì quên luôn, lần sau phải nhập lại tài khoản và mật khẩu.
// Khi có BE: thêm thu hồi refresh token và hết phiên sau một khoảng không dùng.
export async function logout(): Promise<void> {
  await forgetRememberedUser();
}
