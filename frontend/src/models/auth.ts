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
