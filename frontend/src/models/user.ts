export interface User {
  id: string;
  username: string;
  fullName: string;
  accountNumber: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  idNumber?: string;
  address?: string;
  memberSince?: string;
  kycVerified?: boolean;
}
