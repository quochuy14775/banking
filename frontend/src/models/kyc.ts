import type { Gender, User } from './user';

/** Thông tin đọc được từ mã QR ở mặt trước CCCD gắn chip. Ngày dạng ISO `YYYY-MM-DD`. */
export interface CccdInfo {
  idNumber: string;
  /** Số CMND 9 số cũ; trống nếu người dùng làm CCCD lần đầu. */
  oldIdNumber?: string;
  fullName: string;
  dateOfBirth: string;
  gender: Gender;
  permanentAddress: string;
  issueDate?: string;
}

/** Kết quả đọc mã QR: `format` = không phải mã CCCD, `mismatch` = số CCCD không khớp giới tính/năm sinh. */
export type CccdQrResult = { ok: true; info: CccdInfo } | { ok: false; reason: 'format' | 'mismatch' };

/** Phần hồ sơ người dùng được cập nhật sau khi xác thực eKYC thành công. */
export type KycProfile = Required<
  Pick<User, 'fullName' | 'idNumber' | 'dateOfBirth' | 'gender' | 'address' | 'kycVerified'>
> &
  Pick<User, 'oldIdNumber' | 'idIssueDate'>;

export interface SubmitKycRequest {
  userId: string;
  info: CccdInfo;
  /** Người dùng đã đồng ý cho xử lý dữ liệu cá nhân (gồm ảnh khuôn mặt) để định danh. */
  consent: boolean;
  /** Ảnh khuôn mặt chụp lúc nhìn thẳng: đường dẫn file trên máy, base64 trên web. */
  selfie: string;
}

export interface SubmitKycResponse {
  success: boolean;
  profile?: KycProfile;
  message?: string;
}
