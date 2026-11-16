export type TransactionType = 'in' | 'out';

/** Nhóm giao dịch: để chọn biểu tượng và gọi tên loại giao dịch. */
export type TransactionCategory =
  | 'transfer'
  | 'bill'
  | 'salary'
  | 'payment'
  | 'topup'
  | 'cash'
  | 'interest'
  | 'savings';

export interface Transaction {
  id: string;
  accountId: string;
  /** Thời điểm giao dịch, ISO 8601. */
  createdAt: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  /** Số dư tài khoản ngay sau giao dịch. */
  balanceAfter: number;
  /** Nội dung giao dịch (nội dung chuyển khoản). */
  description: string;
  /** Người nhận (tiền ra), người chuyển (tiền vào) hoặc đơn vị nhận thanh toán. */
  counterpartyName: string;
  counterpartyBank?: string;
  counterpartyAccount?: string;
  /** Mã giao dịch, dùng khi cần tra soát với ngân hàng. */
  reference: string;
  fee: number;
}

/** Khoảng ngày lịch `YYYY-MM-DD`, tính cả ngày đầu và ngày cuối. */
export interface DateRange {
  from: string;
  to: string;
}

export interface GetTransactionsRequest extends DateRange {
  userId: string;
  accountId: string;
}

export interface GetTransactionsResponse {
  success: boolean;
  /** Mới nhất trước. */
  items: Transaction[];
  message?: string;
}

export interface GetStatementRequest extends DateRange {
  userId: string;
  accountId: string;
}

export interface AccountStatement extends DateRange {
  accountId: string;
  accountLabel: string;
  accountNumber: string;
  holderName: string;
  openingBalance: number;
  closingBalance: number;
  totalIn: number;
  totalOut: number;
  countIn: number;
  countOut: number;
  /** Cũ nhất trước, đúng thứ tự trên bản sao kê. */
  items: Transaction[];
  /** Thời điểm lập sao kê, ISO 8601. */
  generatedAt: string;
}

export interface GetStatementResponse {
  success: boolean;
  statement?: AccountStatement;
  message?: string;
}
