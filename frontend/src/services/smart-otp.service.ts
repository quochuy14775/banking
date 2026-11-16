import { getRandomBytesAsync } from 'expo-crypto';

import { bytesToHex, totpAtStep, totpStep } from '@/helpers/totp';
import { MOCK_OTP } from '@/lib/mockData';
import type {
  AuthMethod,
  ConfirmSmartOtpActivationRequest,
  ConfirmSmartOtpActivationResponse,
  DeactivateSmartOtpRequest,
  DeactivateSmartOtpResponse,
  GetSmartOtpStatusRequest,
  GetSmartOtpStatusResponse,
  ResendSmartOtpActivationRequest,
  ResendSmartOtpActivationResponse,
  SmartOtpStatus,
  StartSmartOtpActivationRequest,
  StartSmartOtpActivationResponse,
} from '@/models';

const MOCK_DELAY_MS = 500;
// Khóa 160 bit, đúng độ dài RFC 4226 khuyến nghị cho HMAC-SHA1.
const SECRET_BYTES = 20;
// Nhận cả mã của khoảng 30 giây liền trước và liền sau, để bù giờ lệch giữa điện thoại và server.
const ALLOWED_DRIFT_STEPS = 1;
// Mã sai liên tiếp quá số lần này thì server khóa Smart OTP, người dùng phải kích hoạt lại.
const MAX_WRONG_CODES = 5;
const ACTIVATION_TTL_MS = 5 * 60 * 1000;
const EXPIRED_MESSAGE = 'Phiên kích hoạt đã hết hạn, vui lòng thử lại.';

interface Registration {
  secret: string;
  deviceId: string;
  deviceName: string;
  activatedAt: string;
  /** Khoảng thời gian của mã vừa dùng thành công; mỗi mã chỉ được dùng một lần. */
  lastUsedStep: number;
  wrongCodes: number;
}

interface CodeCheck {
  success: boolean;
  message?: string;
}

// Trạng thái mock trong bộ nhớ, mất khi tắt app (giống eKYC). Lúc mở lại, app thấy server không còn nhận
// khóa của máy thì tự xóa khóa trên máy, người dùng kích hoạt lại.
// Khi có BE: server lưu khóa đã mã hóa (CSDL hoặc HSM) và không bao giờ trả lại khóa sau lúc kích hoạt.
const registrations = new Map<string, Registration>();
const pendingActivations = new Map<string, { userId: string; expiresAt: number }>();

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function toStatus(registration: Registration | undefined, deviceId: string): SmartOtpStatus {
  if (!registration) return { active: false, onThisDevice: false };
  return {
    active: true,
    onThisDevice: registration.deviceId === deviceId,
    deviceName: registration.deviceName,
    activatedAt: registration.activatedAt,
  };
}

function activationOf(activationId: string) {
  const pending = pendingActivations.get(activationId);
  return pending && pending.expiresAt > Date.now() ? pending : undefined;
}

export async function getSmartOtpStatus(req: GetSmartOtpStatusRequest): Promise<GetSmartOtpStatusResponse> {
  if (!req.userId) return { success: false, message: 'Thiếu thông tin người dùng.' };
  return { success: true, status: toStatus(registrations.get(req.userId), req.deviceId) };
}

export async function startSmartOtpActivation(
  req: StartSmartOtpActivationRequest,
): Promise<StartSmartOtpActivationResponse> {
  if (!req.userId) return { success: false, message: 'Thiếu thông tin người dùng.' };
  await delay(MOCK_DELAY_MS);
  const activationId = `so-${Date.now()}`;
  pendingActivations.set(activationId, { userId: req.userId, expiresAt: Date.now() + ACTIVATION_TTL_MS });
  return { success: true, activationId };
}

export async function resendSmartOtpActivation(
  req: ResendSmartOtpActivationRequest,
): Promise<ResendSmartOtpActivationResponse> {
  const pending = activationOf(req.activationId);
  if (!pending) return { success: false, message: EXPIRED_MESSAGE };
  pending.expiresAt = Date.now() + ACTIVATION_TTL_MS;
  return { success: true };
}

export async function confirmSmartOtpActivation(
  req: ConfirmSmartOtpActivationRequest,
): Promise<ConfirmSmartOtpActivationResponse> {
  const pending = activationOf(req.activationId);
  if (!pending) return { success: false, message: EXPIRED_MESSAGE };
  await delay(MOCK_DELAY_MS);
  if (req.otp !== MOCK_OTP) return { success: false, message: 'Mã OTP không đúng. Vui lòng thử lại.' };
  pendingActivations.delete(req.activationId);
  const registration: Registration = {
    secret: bytesToHex(await getRandomBytesAsync(SECRET_BYTES)),
    deviceId: req.deviceId,
    deviceName: req.deviceName,
    activatedAt: new Date().toISOString(),
    lastUsedStep: -1,
    wrongCodes: 0,
  };
  // Mỗi lúc chỉ một máy: kích hoạt trên máy mới thì khóa của máy cũ hết hiệu lực.
  registrations.set(pending.userId, registration);
  return { success: true, secret: registration.secret, status: toStatus(registration, req.deviceId) };
}

export async function deactivateSmartOtp(req: DeactivateSmartOtpRequest): Promise<DeactivateSmartOtpResponse> {
  if (!req.userId) return { success: false, message: 'Thiếu thông tin người dùng.' };
  await delay(MOCK_DELAY_MS);
  // Chỉ máy đang giữ Smart OTP mới hủy được; máy khác gọi thì không ảnh hưởng.
  if (registrations.get(req.userId)?.deviceId === req.deviceId) registrations.delete(req.userId);
  return { success: true };
}

// Hai hàm dưới là xử lý nội bộ của server (không phải API), dùng chung cho chuyển khoản và thanh toán hóa đơn.

/** Đã bật Smart OTP thì mọi giao dịch phải xác thực bằng Smart OTP, server không gửi SMS nữa. */
export function authMethodFor(userId: string): AuthMethod {
  return registrations.has(userId) ? 'smartOtp' : 'sms';
}

/** Kiểm tra mã xác thực của giao dịch theo cách xác thực server đã chọn lúc tạo giao dịch. */
export async function checkTransactionCode(userId: string, method: AuthMethod, code: string): Promise<CodeCheck> {
  if (method === 'sms') {
    return code === MOCK_OTP ? { success: true } : { success: false, message: 'Mã OTP không đúng. Vui lòng thử lại.' };
  }
  const registration = registrations.get(userId);
  if (!registration) {
    return { success: false, message: 'Smart OTP đã bị hủy. Vui lòng quay lại và thực hiện lại giao dịch.' };
  }
  // Server tự tính lại mã từ khóa của mình rồi so; app không gửi khóa hay mã PIN lên.
  const current = totpStep(Date.now());
  for (let step = current - ALLOWED_DRIFT_STEPS; step <= current + ALLOWED_DRIFT_STEPS; step++) {
    if ((await totpAtStep(registration.secret, step)) !== code) continue;
    if (step <= registration.lastUsedStep) {
      return {
        success: false,
        message: 'Mã Smart OTP này vừa được dùng. Vui lòng đợi mã mới (tối đa 30 giây) rồi thử lại.',
      };
    }
    registration.lastUsedStep = step;
    registration.wrongCodes = 0;
    return { success: true };
  }
  registration.wrongCodes += 1;
  if (registration.wrongCodes >= MAX_WRONG_CODES) {
    registrations.delete(userId);
    return { success: false, message: 'Nhập sai mã Smart OTP quá nhiều lần nên Smart OTP đã bị khóa. Vui lòng kích hoạt lại.' };
  }
  return { success: false, message: 'Mã Smart OTP không đúng. Vui lòng thử lại.' };
}
