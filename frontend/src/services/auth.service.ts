import AsyncStorage from '@react-native-async-storage/async-storage';

import { mockUser } from '@/lib/mockData';
import type { FaceIdLoginRequest, LoginRequest, LoginResponse, RememberedUser, User } from '@/models';
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
