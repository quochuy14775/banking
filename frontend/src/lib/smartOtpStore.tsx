import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytesAsync, randomUUID } from 'expo-crypto';
import * as Device from 'expo-device';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { bytesToHex, totp } from '@/helpers/totp';
import type { Translate } from '@/i18n';
import { useAuth } from '@/lib/authStore';
import { deleteSecureItem, getSecureItem, setSecureItem } from '@/lib/secureStorage';
import type { StartSmartOtpActivationResponse } from '@/models';
import * as smartOtpService from '@/services/smart-otp.service';

/** Nhập sai mã PIN liên tiếp đến số lần này thì xóa khóa trên máy, người dùng phải kích hoạt lại. */
export const MAX_PIN_ATTEMPTS = 5;
const PIN_SALT_BYTES = 16;
const DEVICE_ID_KEY = 'vietbank.deviceId';

/** Phần Smart OTP nằm trên máy, chỉ lưu trong kho bảo mật và không gửi đi đâu (kể cả mã PIN). */
interface DeviceRecord {
  secret: string;
  pinSalt: string;
  pinHash: string;
  wrongPins: number;
}

export interface SmartOtpInfo {
  deviceName: string;
  activatedAt: string;
}

/** Trạng thái đã đối chiếu với server cho một người dùng. */
interface Snapshot {
  userId: string;
  active: boolean;
  info: SmartOtpInfo | null;
  /** Tên máy khác đang giữ Smart OTP, nếu có. */
  otherDevice: string | null;
}

export type PinFailure =
  | { ok: false; reason: 'wrongPin'; attemptsLeft: number }
  /** Sai PIN quá số lần: đã xóa khóa trên máy và hủy Smart OTP. */
  | { ok: false; reason: 'locked' }
  /** Máy này chưa có Smart OTP. */
  | { ok: false; reason: 'inactive' };

/** `at`: thời điểm (ms) dùng để tính mã, để màn hình biết mã thuộc khoảng 30 giây nào. */
export type CodeResult = { ok: true; code: string; at: number } | PinFailure;
export type DeactivateResult = { ok: true } | PinFailure | { ok: false; reason: 'failed'; message?: string };

interface ActionResult {
  success: boolean;
  message?: string;
}

interface SmartOtpContextValue {
  status: 'loading' | 'inactive' | 'active';
  info: SmartOtpInfo | null;
  otherDevice: string | null;
  /** Đối chiếu lại trạng thái với server (vd khi mở màn Smart OTP). */
  refresh: () => void;
  /** Server gửi mã OTP qua SMS để xác nhận chủ tài khoản trước khi cấp khóa. */
  startActivation: () => Promise<StartSmartOtpActivationResponse>;
  resendActivationOtp: (activationId: string) => Promise<ActionResult>;
  /** Xác thực OTP SMS, nhận khóa từ server rồi lưu khóa và mã PIN (đã băm) vào kho bảo mật của máy. */
  completeActivation: (activationId: string, otp: string, pin: string) => Promise<ActionResult>;
  /** Mở khóa bằng mã PIN rồi tự tính mã Smart OTP của thời điểm hiện tại, không cần mạng. */
  generateCode: (pin: string) => Promise<CodeResult>;
  /** Hủy Smart OTP trên máy này (cần mã PIN); giao dịch quay lại xác thực bằng SMS. */
  deactivate: (pin: string) => Promise<DeactivateResult>;
}

const SmartOtpContext = createContext<SmartOtpContextValue | null>(null);

// Mỗi lần cài app có một mã máy riêng; server dùng để biết Smart OTP đang gắn với máy nào.
let deviceIdTask: Promise<string> | null = null;

function getDeviceId(): Promise<string> {
  deviceIdTask ??= (async () => {
    const saved = await getSecureItem(DEVICE_ID_KEY);
    if (saved) return saved;
    const id = randomUUID();
    await setSecureItem(DEVICE_ID_KEY, id);
    return id;
  })().catch((error: unknown) => {
    deviceIdTask = null;
    throw error;
  });
  return deviceIdTask;
}

function deviceName(): string {
  if (Platform.OS === 'web') return Device.osName ? `Web (${Device.osName})` : 'Web';
  return Device.modelName ?? Device.osName ?? Platform.OS;
}

// Tên khóa của SecureStore chỉ được chứa chữ, số, ".", "-" và "_".
const recordKey = (userId: string) => `vietbank.smartOtp.${userId.replace(/[^\w.-]/g, '_')}`;

async function readRecord(userId: string): Promise<DeviceRecord | null> {
  const raw = await getSecureItem(recordKey(userId));
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<DeviceRecord>;
    if (!value.secret || !value.pinSalt || !value.pinHash) return null;
    return { secret: value.secret, pinSalt: value.pinSalt, pinHash: value.pinHash, wrongPins: value.wrongPins ?? 0 };
  } catch {
    return null;
  }
}

const writeRecord = (userId: string, record: DeviceRecord) => setSecureItem(recordKey(userId), JSON.stringify(record));

const hashPin = (pin: string, salt: string) => digestStringAsync(CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

const inactive = (userId: string, otherDevice: string | null = null): Snapshot => ({
  userId,
  active: false,
  info: null,
  otherDevice,
});

async function loadSnapshot(userId: string): Promise<Snapshot> {
  try {
    const [deviceId, record] = await Promise.all([getDeviceId(), readRecord(userId)]);
    const res = await smartOtpService.getSmartOtpStatus({ userId, deviceId });
    const status = res.status;
    if (!res.success || !status) return inactive(userId);
    if (status.active && status.onThisDevice && record) {
      return {
        userId,
        active: true,
        info: { deviceName: status.deviceName ?? '', activatedAt: status.activatedAt ?? '' },
        otherDevice: null,
      };
    }
    // Server là nơi quyết định: không còn nhận khóa của máy này (đã hủy, bị khóa hoặc đã kích hoạt máy khác)
    // thì xóa khóa cũ trên máy; người dùng kích hoạt lại sẽ được cấp khóa mới.
    if (record) await deleteSecureItem(recordKey(userId));
    return inactive(userId, status.active && !status.onThisDevice ? (status.deviceName ?? '') : null);
  } catch {
    return inactive(userId);
  }
}

export function SmartOtpProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    loadSnapshot(userId).then((next) => {
      if (active) setSnapshot(next);
    });
    return () => {
      active = false;
    };
  }, [userId, reloadKey]);

  // Trạng thái của người dùng khác (vừa đổi tài khoản) không được dùng; chưa đối chiếu xong thì là "loading".
  const current = userId && snapshot?.userId === userId ? snapshot : null;
  const status = !userId ? 'inactive' : !current ? 'loading' : current.active ? 'active' : 'inactive';
  // Giữ nguyên tham chiếu để màn hình gọi trong useFocusEffect không bị chạy lại sau mỗi lần render.
  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  async function checkPin(pin: string): Promise<{ ok: true; record: DeviceRecord } | PinFailure> {
    if (!userId) return { ok: false, reason: 'inactive' };
    const record = await readRecord(userId);
    if (!record) return { ok: false, reason: 'inactive' };
    if ((await hashPin(pin, record.pinSalt)) === record.pinHash) {
      if (record.wrongPins > 0) await writeRecord(userId, { ...record, wrongPins: 0 });
      return { ok: true, record };
    }
    const wrongPins = record.wrongPins + 1;
    if (wrongPins < MAX_PIN_ATTEMPTS) {
      await writeRecord(userId, { ...record, wrongPins });
      return { ok: false, reason: 'wrongPin', attemptsLeft: MAX_PIN_ATTEMPTS - wrongPins };
    }
    // Sai quá số lần: xóa khóa trên máy và hủy luôn phía server để giao dịch quay về SMS.
    await deleteSecureItem(recordKey(userId));
    await smartOtpService.deactivateSmartOtp({ userId, deviceId: await getDeviceId() }).catch(() => undefined);
    setSnapshot(inactive(userId));
    return { ok: false, reason: 'locked' };
  }

  async function startActivation(): Promise<StartSmartOtpActivationResponse> {
    if (!userId) return { success: false };
    return smartOtpService.startSmartOtpActivation({ userId });
  }

  function resendActivationOtp(activationId: string): Promise<ActionResult> {
    return smartOtpService.resendSmartOtpActivation({ activationId });
  }

  async function completeActivation(activationId: string, otp: string, pin: string): Promise<ActionResult> {
    if (!userId) return { success: false };
    const deviceId = await getDeviceId();
    const res = await smartOtpService.confirmSmartOtpActivation({ activationId, otp, deviceId, deviceName: deviceName() });
    if (!res.success || !res.secret) return { success: false, message: res.message };
    try {
      const pinSalt = bytesToHex(await getRandomBytesAsync(PIN_SALT_BYTES));
      await writeRecord(userId, { secret: res.secret, pinSalt, pinHash: await hashPin(pin, pinSalt), wrongPins: 0 });
    } catch {
      // Không lưu được khóa thì máy không tạo được mã: hủy luôn phía server để giao dịch vẫn dùng SMS.
      await smartOtpService.deactivateSmartOtp({ userId, deviceId }).catch(() => undefined);
      return { success: false };
    }
    setSnapshot({
      userId,
      active: true,
      info: { deviceName: res.status?.deviceName ?? deviceName(), activatedAt: res.status?.activatedAt ?? '' },
      otherDevice: null,
    });
    return { success: true };
  }

  async function generateCode(pin: string): Promise<CodeResult> {
    const check = await checkPin(pin);
    if (!check.ok) return check;
    const at = Date.now();
    return { ok: true, code: await totp(check.record.secret, at), at };
  }

  async function deactivate(pin: string): Promise<DeactivateResult> {
    if (!userId) return { ok: false, reason: 'inactive' };
    const check = await checkPin(pin);
    if (!check.ok) return check;
    const res = await smartOtpService.deactivateSmartOtp({ userId, deviceId: await getDeviceId() });
    if (!res.success) return { ok: false, reason: 'failed', message: res.message };
    await deleteSecureItem(recordKey(userId));
    setSnapshot(inactive(userId));
    return { ok: true };
  }

  return (
    <SmartOtpContext.Provider
      value={{
        status,
        info: current?.info ?? null,
        otherDevice: current?.otherDevice ?? null,
        refresh,
        startActivation,
        resendActivationOtp,
        completeActivation,
        generateCode,
        deactivate,
      }}>
      {children}
    </SmartOtpContext.Provider>
  );
}

export function useSmartOtp(): SmartOtpContextValue {
  const ctx = useContext(SmartOtpContext);
  if (!ctx) throw new Error('useSmartOtp must be used within SmartOtpProvider');
  return ctx;
}

/** Câu báo lỗi (đã dịch) khi mở khóa Smart OTP bằng mã PIN không được. */
export function pinFailureMessage(failure: PinFailure, t: Translate): string {
  if (failure.reason === 'wrongPin') return t('smartOtp.errors.wrongPin', { count: failure.attemptsLeft });
  if (failure.reason === 'locked') return t('smartOtp.errors.locked', { count: MAX_PIN_ATTEMPTS });
  return t('smartOtp.errors.notOnDevice');
}
