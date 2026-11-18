import { removeDiacritics } from '@/helpers';
import { mockAccounts, mockBillDirectory, mockBillHistory, mockBillProviders, mockSavedBills } from '@/shared/lib/mockData';
import type {
  AuthMethod,
  BillDetail,
  BillHistoryItem,
  GetBillHistoryRequest,
  GetBillHistoryResponse,
  GetBillProvidersResponse,
  GetSavedBillsRequest,
  GetSavedBillsResponse,
  LookupBillRequest,
  LookupBillResponse,
  PayBillRequest,
  PayBillResponse,
  ResendBillOtpRequest,
  ResendBillOtpResponse,
  VerifyBillOtpRequest,
  VerifyBillOtpResponse,
} from '@/models';
import { authMethodFor, checkTransactionCode } from '@/services/smart-otp.service';
import { recordTransaction } from '@/services/transaction.service';

const MOCK_DELAY_MS = 500;

// Trạng thái mock trong bộ nhớ; khi có BE thì nằm phía server.
const paidBillIds = new Set(mockBillDirectory.filter((b) => b.paid).map((b) => b.id));
const pendingPayments = new Map<string, { req: PayBillRequest; authMethod: AuthMethod }>();
const sessionHistory: BillHistoryItem[] = [];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const normalizeCode = (code: string) => code.replace(/\s/g, '').toUpperCase();

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function toDetail(entry: (typeof mockBillDirectory)[number]): BillDetail {
  const { paid: _paid, ...bill } = entry;
  return bill;
}

function outstanding(providerId: string, customerCode: string): BillDetail | undefined {
  const code = normalizeCode(customerCode);
  const found = mockBillDirectory.find(
    (b) => b.providerId === providerId && normalizeCode(b.customerCode) === code && !paidBillIds.has(b.id),
  );
  return found && toDetail(found);
}

// Tên hiển thị của hóa đơn: nhãn người dùng đã lưu ("Điện nhà"), không có thì tên doanh nghiệp.
function labelOf(bill: BillDetail): string {
  const saved = mockSavedBills.find(
    (s) => s.providerId === bill.providerId && normalizeCode(s.customerCode) === normalizeCode(bill.customerCode),
  );
  return saved?.label ?? mockBillProviders.find((p) => p.id === bill.providerId)?.shortName ?? bill.customerCode;
}

export async function getBillProviders(): Promise<GetBillProvidersResponse> {
  return { success: true, items: mockBillProviders };
}

export async function getSavedBills(req: GetSavedBillsRequest): Promise<GetSavedBillsResponse> {
  if (!req.userId) return { success: false, items: [], message: 'Thiếu thông tin người dùng.' };
  return {
    success: true,
    items: mockSavedBills.map((s) => ({ ...s, bill: outstanding(s.providerId, s.customerCode) })),
  };
}

export async function getBillHistory(req: GetBillHistoryRequest): Promise<GetBillHistoryResponse> {
  if (!req.userId) return { success: false, items: [], message: 'Thiếu thông tin người dùng.' };
  return { success: true, items: [...sessionHistory, ...mockBillHistory] };
}

export async function lookupBill(req: LookupBillRequest): Promise<LookupBillResponse> {
  const code = normalizeCode(req.customerCode);
  if (!req.providerId || !code) return { success: false, message: 'Vui lòng nhập mã khách hàng.' };
  await delay(MOCK_DELAY_MS);
  const known = mockBillDirectory.some((b) => b.providerId === req.providerId && normalizeCode(b.customerCode) === code);
  if (!known) return { success: false, message: 'Không tìm thấy khách hàng với mã này.' };
  const bill = outstanding(req.providerId, code);
  if (!bill) return { success: false, message: 'Khách hàng không còn nợ cước kỳ này.' };
  return { success: true, bill };
}

export async function payBill(req: PayBillRequest): Promise<PayBillResponse> {
  const account = mockAccounts.find((a) => a.id === req.fromAccountId);
  if (!req.userId || !account) return { success: false, message: 'Tài khoản nguồn không hợp lệ.' };
  const bills = req.billIds.map((id) => mockBillDirectory.find((b) => b.id === id));
  if (bills.length === 0 || bills.some((b) => !b || paidBillIds.has(b.id))) {
    return { success: false, message: 'Hóa đơn không còn hiệu lực.' };
  }
  const total = bills.reduce((sum, b) => sum + (b?.amount ?? 0), 0);
  if (total > account.balance) return { success: false, message: 'Số dư không đủ để thanh toán.' };
  await delay(MOCK_DELAY_MS);
  const paymentId = `bp-${Date.now()}`;
  const authMethod = authMethodFor(req.userId);
  pendingPayments.set(paymentId, { req, authMethod });
  return { success: true, paymentId, authMethod };
}

export async function verifyBillOtp(req: VerifyBillOtpRequest): Promise<VerifyBillOtpResponse> {
  const pending = pendingPayments.get(req.paymentId);
  if (!pending) return { success: false, message: 'Giao dịch không tồn tại hoặc đã hết hạn.' };
  await delay(MOCK_DELAY_MS);
  const check = await checkTransactionCode(pending.req.userId, pending.authMethod, req.otp);
  if (!check.success) return check;
  pendingPayments.delete(req.paymentId);
  const paidAt = todayISO();
  const reference = `HD${req.paymentId.slice(-8)}`;
  const { billIds, fromAccountId } = pending.req;
  billIds.forEach((id, index) => {
    const entry = mockBillDirectory.find((b) => b.id === id);
    if (!entry) return;
    paidBillIds.add(id);
    const bill = toDetail(entry);
    sessionHistory.unshift({
      id: `paid-${id}-${Date.now()}`,
      providerId: bill.providerId,
      label: labelOf(bill),
      period: bill.period,
      amount: bill.amount,
      paidAt,
    });
    // Mỗi hóa đơn là một giao dịch trong lịch sử; trả nhiều hóa đơn một lần thì mã giao dịch thêm số thứ tự.
    const provider = mockBillProviders.find((p) => p.id === bill.providerId);
    recordTransaction({
      accountId: fromAccountId,
      type: 'out',
      category: 'bill',
      amount: bill.amount,
      counterpartyName: (provider?.shortName ?? bill.providerId).toUpperCase(),
      description: removeDiacritics(
        `Thanh toán hóa đơn ${provider?.shortName ?? ''} - Mã KH ${bill.customerCode} - ${bill.period}`,
      ),
      reference: billIds.length > 1 ? `${reference}-${index + 1}` : reference,
    });
  });
  return { success: true, reference };
}

export async function resendBillOtp(req: ResendBillOtpRequest): Promise<ResendBillOtpResponse> {
  const pending = pendingPayments.get(req.paymentId);
  if (!pending) return { success: false, message: 'Giao dịch không tồn tại hoặc đã hết hạn.' };
  if (pending.authMethod !== 'sms') return { success: false, message: 'Giao dịch này xác thực bằng Smart OTP, không gửi mã qua SMS.' };
  return { success: true };
}

// Chỉ dùng cho bản demo: mã khách hàng mẫu của từng doanh nghiệp để người xem biết nhập gì.
export function getDemoCustomerCodes(providerId: string): string[] {
  return mockBillDirectory.filter((b) => b.providerId === providerId).map((b) => b.customerCode);
}
