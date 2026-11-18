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

/** Nhân viên ngân hàng (vai trò ADMIN của auth-service): dùng màn duyệt hồ sơ đăng ký thay cho các tab của khách. */
export interface StaffUser {
  id: string;
  username: string;
}

/**
 * Cặp token auth-service cấp khi đăng nhập thật. Chỉ giữ trong bộ nhớ (tắt app hoặc tải lại trang là phải đăng nhập
 * lại), không ghi xuống máy và không in ra log.
 */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
}

/** Lý do đăng nhập thất bại; màn hình chọn câu thông báo theo ngôn ngữ đang dùng. */
export type LoginError = 'invalidCredentials' | 'locked' | 'disabled' | 'unsupportedRole' | 'network' | 'unknown';

export interface LoginResponse {
  success: boolean;
  /** Khách hàng đăng nhập: vào các tab của khách. */
  user?: User;
  /** Nhân viên đăng nhập: vào màn duyệt hồ sơ. */
  staff?: StaffUser;
  /** Có khi đăng nhập bằng auth-service thật; chế độ mock không có token. */
  tokens?: SessionTokens;
  error?: LoginError;
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

/** Tài khoản đăng nhập, đúng như auth-service trả về (khi đăng ký, và ở GET /api/auth/me). */
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
