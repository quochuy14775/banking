import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Dữ liệu nhạy cảm (khóa Smart OTP, mã PIN đã băm) nằm trong Keychain (iOS) / Keystore (Android) qua
// expo-secure-store: chỉ đọc được khi máy đã mở khóa và không đi theo bản sao lưu sang máy khác.
// Web không có kho tương đương nên chỉ giữ trong bộ nhớ (tải lại trang là mất), không ghi xuống localStorage.
const WRITE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};
const isWeb = Platform.OS === 'web';
const webMemory = new Map<string, string>();

export async function getSecureItem(key: string): Promise<string | null> {
  if (isWeb) return webMemory.get(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    webMemory.set(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value, WRITE_OPTIONS);
}

export async function deleteSecureItem(key: string): Promise<void> {
  if (isWeb) {
    webMemory.delete(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
