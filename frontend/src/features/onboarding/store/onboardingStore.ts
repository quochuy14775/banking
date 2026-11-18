import { deleteSecureItem, getSecureItem, setSecureItem } from '@/shared/lib/secureStorage';
import type { SavedApplication } from '@/models';

// Hồ sơ đăng ký đã gửi (mã hồ sơ + mã tra cứu) giữ trong Keychain/Keystore qua expo-secure-store, để khách tắt app rồi
// mở lại vẫn xem được trạng thái và tạo tài khoản đăng nhập sau khi được duyệt. Web chỉ giữ trong bộ nhớ.
// Mỗi máy giữ tối đa một hồ sơ đang theo dõi; gửi hồ sơ mới thì ghi đè.
const KEY = 'vietbank.onboardingApplication.v1';

export async function loadSavedApplication(): Promise<SavedApplication | null> {
  try {
    const raw = await getSecureItem(KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<SavedApplication>;
    if (!value.applicationId || !value.accessCode) return null;
    return { applicationId: value.applicationId, accessCode: value.accessCode, fullName: value.fullName ?? '' };
  } catch {
    return null;
  }
}

export async function saveApplication(application: SavedApplication): Promise<void> {
  await setSecureItem(KEY, JSON.stringify(application));
}

/** Đã tạo tài khoản đăng nhập xong, hoặc khách muốn làm hồ sơ mới: quên hồ sơ trên máy. */
export async function clearSavedApplication(): Promise<void> {
  await deleteSecureItem(KEY).catch(() => {});
}
