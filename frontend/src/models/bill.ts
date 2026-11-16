import type { AuthMethod } from './smart-otp';

export interface Bill {
  id: string;
  name: string;
  dueLabel: string;
  amount: number;
}

export type BillCategory = 'electricity' | 'water' | 'internet' | 'tv' | 'mobile' | 'tuition' | 'insurance';

/** Doanh nghiệp nhận thanh toán hoá đơn. */
export interface BillProvider {
  id: string;
  category: BillCategory;
  name: string;
  shortName: string;
  /** Chữ viết tắt hiện trong ô màu nhận diện (2–4 ký tự). */
  badge: string;
  /** Màu nhận diện cho ô viết tắt của doanh nghiệp. */
  color: string;
  /** Ví dụ định dạng mã khách hàng để gợi ý trong ô nhập. */
  codeHint: string;
}

export interface BillDetail {
  id: string;
  providerId: string;
  customerCode: string;
  customerName: string;
  address: string;
  period: string;
  /** Ngày ISO `YYYY-MM-DD`. */
  dueDate: string;
  amount: number;
}

/** Hoá đơn người dùng đã lưu; `bill` là kỳ đang nợ, không có nghĩa là đã thanh toán hết. */
export interface SavedBill {
  providerId: string;
  customerCode: string;
  label: string;
  bill?: BillDetail;
}

export interface GetBillProvidersResponse {
  success: boolean;
  items: BillProvider[];
  message?: string;
}

export interface GetSavedBillsRequest {
  userId: string;
}

export interface GetSavedBillsResponse {
  success: boolean;
  items: SavedBill[];
  message?: string;
}

export interface LookupBillRequest {
  providerId: string;
  customerCode: string;
}

export interface LookupBillResponse {
  success: boolean;
  bill?: BillDetail;
  message?: string;
}

export interface PayBillRequest {
  userId: string;
  fromAccountId: string;
  /** Một hoặc nhiều hóa đơn ("Thanh toán tất cả"), xác thực chung một mã OTP. */
  billIds: string[];
}

export interface PayBillResponse {
  success: boolean;
  paymentId?: string;
  /** Server chọn cách xác thực: đã bật Smart OTP thì dùng Smart OTP, không gửi SMS. */
  authMethod?: AuthMethod;
  message?: string;
}

export interface VerifyBillOtpRequest {
  paymentId: string;
  otp: string;
}

export interface VerifyBillOtpResponse {
  success: boolean;
  /** Mã tham chiếu giao dịch để hiển thị ở màn thành công. */
  reference?: string;
  message?: string;
}

/** Hóa đơn đã thanh toán (lịch sử). */
export interface BillHistoryItem {
  id: string;
  providerId: string;
  label: string;
  period: string;
  amount: number;
  /** Ngày ISO `YYYY-MM-DD`. */
  paidAt: string;
}

export interface GetBillHistoryRequest {
  userId: string;
}

export interface GetBillHistoryResponse {
  success: boolean;
  items: BillHistoryItem[];
  message?: string;
}

export interface ResendBillOtpRequest {
  paymentId: string;
}

export interface ResendBillOtpResponse {
  success: boolean;
  message?: string;
}
