import AsyncStorage from '@react-native-async-storage/async-storage';

import { AUTH_API_URL, USE_MOCK_AUTH } from '@/constants/api';
import { normalizeUsername } from '@/helpers';
import { apiRequest, type ApiProblem } from '@/shared/lib/apiClient';
import { mockUser } from '@/shared/lib/mockData';
import type {
  FaceIdLoginRequest,
  LoginError,
  LoginRequest,
  LoginResponse,
  RegisterField,
  RegisteredUser,
  RegisterRequest,
  RegisterResponse,
  RememberedUser,
  SessionTokens,
  User,
} from '@/models';
import { withKycProfile } from '@/services/kyc.service';

const MOCK_DELAY_MS = 600;
// Nhớ khách đã đăng nhập trên máy (chỉ thông tin hiển thị, không lưu mật khẩu hay token) để lần sau
// chỉ cần nhập mật khẩu. Nhân viên không được nhớ.
const REMEMBERED_USER_KEY = 'vietbank.rememberedUser.v1';

/** Cặp token auth-service trả khi đăng nhập (TokenResponse). */
interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
}

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

/**
 * Đăng nhập. Có địa chỉ auth-service (EXPO_PUBLIC_AUTH_API_URL) thì gọi backend thật: POST /api/auth/login lấy cặp
 * token, rồi GET /api/auth/me lấy vai trò. ADMIN là nhân viên (vào màn duyệt hồ sơ), CUSTOMER là khách (vào các tab
 * của khách). Không có địa chỉ thì dùng mock: nhập gì cũng vào bằng tài khoản khách demo.
 */
export async function login(req: LoginRequest): Promise<LoginResponse> {
  const username = req.username.trim();
  if (!username || !req.password) {
    return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' };
  }
  if (USE_MOCK_AUTH) return loginMock(username);

  const tokenResult = await apiRequest<TokenResponse>(AUTH_API_URL, '/api/auth/login', {
    method: 'POST',
    body: { username, password: req.password },
  });
  if (!tokenResult.ok) return { success: false, error: toLoginError(tokenResult.problem) };
  const tokens: SessionTokens = {
    accessToken: tokenResult.data.accessToken,
    refreshToken: tokenResult.data.refreshToken,
  };

  // Vai trò hỏi auth-service thay vì tự giải mã access token: app coi token là chuỗi kín, chỉ gửi kèm khi gọi API.
  const me = await apiRequest<RegisteredUser>(AUTH_API_URL, '/api/auth/me', { accessToken: tokens.accessToken });
  if (!me.ok) {
    void revokeSession(tokens.refreshToken);
    return { success: false, error: toLoginError(me.problem) };
  }
  const roles = me.data.roles ?? [];
  if (roles.includes('ADMIN')) {
    return { success: true, staff: { id: me.data.id, username: me.data.username }, tokens };
  }
  if (roles.includes('CUSTOMER')) {
    // Chưa có API hồ sơ khách: thông tin hiển thị, tài khoản, giao dịch vẫn lấy từ dữ liệu mock; tên đăng nhập là thật.
    const user = withKycProfile({ ...mockUser, username: me.data.username });
    await rememberUser(user);
    return { success: true, user, tokens };
  }
  void revokeSession(tokens.refreshToken);
  return { success: false, error: 'unsupportedRole' };
}

async function loginMock(username: string): Promise<LoginResponse> {
  await delay(MOCK_DELAY_MS);
  const user = withKycProfile({ ...mockUser, username });
  await rememberUser(user);
  return { success: true, user };
}

// Đổi lỗi của auth-service thành loại lỗi; màn đăng nhập chọn câu thông báo theo ngôn ngữ đang dùng.
function toLoginError(problem: ApiProblem): LoginError {
  if (problem.status === 0) return 'network';
  switch (problem.code) {
    // Tên hoặc mật khẩu dài quá giới hạn (VALIDATION_FAILED) cũng báo như sai thông tin, không lộ quy tắc.
    case 'AUTH_INVALID_CREDENTIALS':
    case 'VALIDATION_FAILED':
      return 'invalidCredentials';
    case 'AUTH_USER_LOCKED':
      return 'locked';
    case 'AUTH_USER_DISABLED':
      return 'disabled';
    default:
      return 'unknown';
  }
}

/**
 * Face ID chỉ có ở chế độ mock. Với auth-service thật, Face ID phải mở khoá refresh token lưu an toàn trên máy rồi đổi
 * lấy token mới; app chưa lưu refresh token nên màn đăng nhập ẩn nút Face ID.
 */
export async function loginWithFaceId(req: FaceIdLoginRequest): Promise<LoginResponse> {
  if (!USE_MOCK_AUTH) return { success: false, error: 'unknown' };
  if (!req.username) return { success: false, message: 'Chưa có tài khoản đăng nhập trên máy này.' };
  await delay(MOCK_DELAY_MS);
  return { success: true, user: withKycProfile({ ...mockUser, username: req.username }) };
}

/**
 * Thu hồi phiên đăng nhập ở auth-service (POST /api/auth/logout) để refresh token không dùng lại được.
 * Không chờ kết quả: lỗi mạng ở đây không giữ người dùng lại trong app.
 */
export async function revokeSession(refreshToken: string): Promise<void> {
  if (USE_MOCK_AUTH) return;
  await apiRequest<void>(AUTH_API_URL, '/api/auth/logout', { method: 'POST', body: { refreshToken } });
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

// Chưa đăng xuất (chỉ tắt app) thì vẫn nhớ người dùng: lần sau chỉ cần mật khẩu (hoặc Face ID ở chế độ mock).
// Chủ động đăng xuất thì quên luôn, lần sau phải nhập lại tài khoản và mật khẩu; có phiên thật thì thu hồi luôn.
export async function logout(refreshToken?: string): Promise<void> {
  if (refreshToken) void revokeSession(refreshToken);
  await forgetRememberedUser();
}
