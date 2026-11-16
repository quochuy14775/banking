import type { AuthMethod } from './smart-otp';

export interface Contact {
  id: string;
  name: string;
  bank: string;
  number: string;
}

export interface GetContactsRequest {
  userId: string;
}

export interface GetContactsResponse {
  success: boolean;
  items: Contact[];
  message?: string;
}

export interface LookupAccountRequest {
  bank: string;
  number: string;
}

export interface LookupAccountResponse {
  success: boolean;
  name?: string;
  message?: string;
}

export interface CreateTransferRequest {
  userId: string;
  fromAccountId: string;
  toBank: string;
  toNumber: string;
  toName: string;
  amount: number;
  note?: string;
}

export interface CreateTransferResponse {
  success: boolean;
  transferId?: string;
  /** Server chọn cách xác thực: đã bật Smart OTP thì dùng Smart OTP, không gửi SMS. */
  authMethod?: AuthMethod;
  message?: string;
}

export interface VerifyTransferOtpRequest {
  transferId: string;
  otp: string;
}

export interface VerifyTransferOtpResponse {
  success: boolean;
  message?: string;
}

export interface ResendTransferOtpRequest {
  transferId: string;
}

export interface ResendTransferOtpResponse {
  success: boolean;
  message?: string;
}
