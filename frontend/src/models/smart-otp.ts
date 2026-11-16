/** Cách xác thực giao dịch: mã OTP gửi qua SMS, hoặc Smart OTP do app tự tạo trên máy. */
export type AuthMethod = 'sms' | 'smartOtp';

export interface SmartOtpStatus {
  active: boolean;
  /** Smart OTP đang gắn với máy gửi yêu cầu (mỗi lúc chỉ một máy được dùng). */
  onThisDevice: boolean;
  deviceName?: string;
  /** Thời điểm kích hoạt, ISO 8601. */
  activatedAt?: string;
}

export interface GetSmartOtpStatusRequest {
  userId: string;
  deviceId: string;
}

export interface GetSmartOtpStatusResponse {
  success: boolean;
  status?: SmartOtpStatus;
  message?: string;
}

/** Bắt đầu kích hoạt: server gửi mã OTP qua SMS tới số điện thoại của tài khoản. */
export interface StartSmartOtpActivationRequest {
  userId: string;
}

export interface StartSmartOtpActivationResponse {
  success: boolean;
  activationId?: string;
  message?: string;
}

export interface ResendSmartOtpActivationRequest {
  activationId: string;
}

export interface ResendSmartOtpActivationResponse {
  success: boolean;
  message?: string;
}

/** Xác thực mã OTP SMS; đúng thì server cấp khóa bí mật cho máy này. */
export interface ConfirmSmartOtpActivationRequest {
  activationId: string;
  otp: string;
  deviceId: string;
  deviceName: string;
}

export interface ConfirmSmartOtpActivationResponse {
  success: boolean;
  /** Khóa bí mật (hex) để app tạo mã. Chỉ trả về một lần lúc kích hoạt, app lưu vào kho bảo mật của máy. */
  secret?: string;
  status?: SmartOtpStatus;
  message?: string;
}

export interface DeactivateSmartOtpRequest {
  userId: string;
  deviceId: string;
}

export interface DeactivateSmartOtpResponse {
  success: boolean;
  message?: string;
}
