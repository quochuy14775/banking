export type Gender = 'male' | 'female';

export interface User {
  id: string;
  username: string;
  fullName: string;
  accountNumber: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  /** Số CCCD 12 số; có sau khi xác thực eKYC. */
  idNumber?: string;
  /** Số CMND 9 số cũ in trong mã QR của CCCD (người làm CCCD lần đầu thì không có). */
  oldIdNumber?: string;
  /** Ngày ISO `YYYY-MM-DD`. */
  dateOfBirth?: string;
  gender?: Gender;
  /** Nơi thường trú theo CCCD. */
  address?: string;
  /** Ngày cấp CCCD, ISO `YYYY-MM-DD`. */
  idIssueDate?: string;
  memberSince?: string;
  kycVerified?: boolean;
}
