import type { User } from './user';

export interface LoginRequest {
  username: string;
  password: string;
}

/** Người dùng đã đăng nhập trên máy này; chỉ gồm thông tin hiển thị, không có mật khẩu hay token. */
export type RememberedUser = Pick<User, 'id' | 'username' | 'fullName' | 'avatarUrl'>;

export interface FaceIdLoginRequest {
  username: string;
}

export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

/**
 * Tạo tài khoản đăng nhập, bước cuối của đăng ký: chỉ làm được khi hồ sơ đăng ký (CCCD + ảnh) đã được nhân viên duyệt.
 * `applicationId` và `accessCode` là mã hồ sơ và mã tra cứu nhận được khi gửi hồ sơ.
 */
export interface RegisterRequest {
  username: string;
  password: string;
  applicationId: string;
  accessCode: string;
}

/** Tài khoản đăng nhập vừa tạo, đúng như auth-service trả về. */
export interface RegisteredUser {
  id: string;
  username: string;
  roles: string[];
  /** Khách hàng (CIF) mà tài khoản thuộc về. */
  customerId?: string;
}

export type RegisterField = 'username' | 'password';

export interface RegisterResponse {
  success: boolean;
  user?: RegisteredUser;
  /** Lỗi chung, hiện dưới form. */
  message?: string;
  /** Lỗi của từng ô, hiện ngay dưới ô đó. */
  fieldErrors?: Partial<Record<RegisterField, string>>;
}
