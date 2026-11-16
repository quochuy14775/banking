import { toCardName } from '@/helpers';
import { buildVietQr } from '@/helpers/vietqr';
import { APP_BANK, mockAccountDirectory, mockAccounts, mockContacts, mockUser } from '@/lib/mockData';
import type {
  AuthMethod,
  CreateTransferRequest,
  CreateTransferResponse,
  GetContactsRequest,
  GetContactsResponse,
  LookupAccountRequest,
  LookupAccountResponse,
  ResendTransferOtpRequest,
  ResendTransferOtpResponse,
  VerifyTransferOtpRequest,
  VerifyTransferOtpResponse,
} from '@/models';
import { authMethodFor, checkTransactionCode } from '@/services/smart-otp.service';
import { recordTransaction } from '@/services/transaction.service';

const MOCK_DELAY_MS = 500;
const MIN_ACCOUNT_DIGITS = 6;

// Lệnh chuyển đang chờ xác thực (kèm cách xác thực server đã chọn); khi có BE thì trạng thái này nằm phía server.
const pendingTransfers = new Map<string, { req: CreateTransferRequest; authMethod: AuthMethod }>();

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function getContacts(req: GetContactsRequest): Promise<GetContactsResponse> {
  if (!req.userId) return { success: false, items: [], message: 'Thiếu thông tin người dùng.' };
  return { success: true, items: mockContacts };
}

export async function lookupAccount(req: LookupAccountRequest): Promise<LookupAccountResponse> {
  const digits = req.number.replace(/\D/g, '');
  if (!req.bank.trim() || digits.length < MIN_ACCOUNT_DIGITS) {
    return { success: false, message: 'Số tài khoản không hợp lệ.' };
  }
  await delay(MOCK_DELAY_MS);
  const found = mockAccountDirectory.find((a) => a.number === digits);
  if (!found) return { success: false, message: 'Không tìm thấy tài khoản người nhận.' };
  return { success: true, name: found.name };
}

// Chỉ dùng cho bản demo: mã VietQR mẫu để thử luồng QR Pay khi không có camera (ví dụ trên web).
export function getDemoQrPayload(): string {
  return buildVietQr({ bin: '970436', accountNumber: '0123456789', amount: 150000, note: 'Thanh toan ca phe' });
}

// Chỉ dùng cho bản demo: số tài khoản mẫu để người xem biết nhập gì. Bỏ khi có BE thật.
export function getDemoLookupNumbers(): string[] {
  return mockAccountDirectory.map((a) => a.number);
}

export async function createTransfer(req: CreateTransferRequest): Promise<CreateTransferResponse> {
  const account = mockAccounts.find((a) => a.id === req.fromAccountId);
  if (!req.userId || !account) return { success: false, message: 'Tài khoản nguồn không hợp lệ.' };
  if (!(req.amount > 0)) return { success: false, message: 'Số tiền không hợp lệ.' };
  if (req.amount > account.balance) return { success: false, message: 'Số dư không đủ để thực hiện giao dịch.' };
  await delay(MOCK_DELAY_MS);
  const transferId = `tf-${Date.now()}`;
  const authMethod = authMethodFor(req.userId);
  pendingTransfers.set(transferId, { req, authMethod });
  return { success: true, transferId, authMethod };
}

export async function verifyTransferOtp(req: VerifyTransferOtpRequest): Promise<VerifyTransferOtpResponse> {
  const pending = pendingTransfers.get(req.transferId);
  if (!pending) return { success: false, message: 'Giao dịch không tồn tại hoặc đã hết hạn.' };
  await delay(MOCK_DELAY_MS);
  const check = await checkTransactionCode(pending.req.userId, pending.authMethod, req.otp);
  if (!check.success) return check;
  pendingTransfers.delete(req.transferId);
  recordTransfer(pending.req);
  return { success: true };
}

// Ghi vào lịch sử của tài khoản nguồn (và trừ số dư). Chuyển sang một tài khoản khác của chính mình trong VietBank
// thì tài khoản nhận cũng có giao dịch tiền vào.
function recordTransfer(req: CreateTransferRequest) {
  const sender = toCardName(mockUser.fullName);
  const description = req.note || `${sender} chuyen tien`;
  recordTransaction({
    accountId: req.fromAccountId,
    type: 'out',
    category: 'transfer',
    amount: req.amount,
    counterpartyName: req.toName,
    counterpartyBank: req.toBank,
    counterpartyAccount: req.toNumber,
    description,
  });
  const from = mockAccounts.find((a) => a.id === req.fromAccountId);
  const digits = (value: string) => value.replace(/\D/g, '');
  const own = mockAccounts.find((a) => a.id !== req.fromAccountId && digits(a.number) === digits(req.toNumber));
  if (!from || !own || req.toBank !== APP_BANK.shortName) return;
  recordTransaction({
    accountId: own.id,
    type: 'in',
    category: 'transfer',
    amount: req.amount,
    counterpartyName: sender,
    counterpartyBank: APP_BANK.shortName,
    counterpartyAccount: from.number,
    description,
  });
}

export async function resendTransferOtp(req: ResendTransferOtpRequest): Promise<ResendTransferOtpResponse> {
  const pending = pendingTransfers.get(req.transferId);
  if (!pending) return { success: false, message: 'Giao dịch không tồn tại hoặc đã hết hạn.' };
  if (pending.authMethod !== 'sms') return { success: false, message: 'Giao dịch này xác thực bằng Smart OTP, không gửi mã qua SMS.' };
  return { success: true };
}
