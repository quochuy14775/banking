import { parseISODate, toCardName } from '@/helpers';
import { mockAccounts, mockTransactionSeeds, mockUser, type TransactionSeed } from '@/lib/mockData';
import type {
  Account,
  DateRange,
  GetStatementRequest,
  GetStatementResponse,
  GetTransactionsRequest,
  GetTransactionsResponse,
  Transaction,
  TransactionCategory,
} from '@/models';

const MOCK_DELAY_MS = 400;
const DAY_MS = 86_400_000;

// Tiền tố mã giao dịch theo loại, giống cách ngân hàng đánh mã (FT: chuyển tiền, BP: hóa đơn...).
const REFERENCE_PREFIX: Record<TransactionCategory, string> = {
  transfer: 'FT',
  salary: 'FT',
  savings: 'FT',
  bill: 'BP',
  payment: 'QR',
  topup: 'TP',
  cash: 'AT',
  interest: 'IN',
};

// Sổ giao dịch của từng tài khoản (mới nhất trước), dựng từ dữ liệu mẫu ở lần đầu cần. Trạng thái mock trong bộ nhớ,
// mất khi tắt app; khi có BE thì đây là bảng giao dịch phía server.
const ledgers = new Map<string, Transaction[]>();
let sequence = 0;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

const pad = (n: number) => String(n).padStart(2, '0');
const signed = (tx: Pick<Transaction, 'type' | 'amount'>) => (tx.type === 'in' ? tx.amount : -tx.amount);

function seedTime(seed: TransactionSeed, now: number): number {
  if ('minutes' in seed.ago) return now - seed.ago.minutes * 60_000;
  const [hours, minutes] = seed.ago.at.split(':').map(Number);
  const date = new Date(now);
  date.setDate(date.getDate() - seed.ago.days);
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

function makeReference(category: TransactionCategory, time: number): string {
  const d = new Date(time);
  sequence += 1;
  const stamp = `${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return `${REFERENCE_PREFIX[category]}${stamp}${pad(sequence % 100)}`;
}

// Số dư sau từng giao dịch tính lùi từ số dư hiện tại, nên giao dịch mới nhất luôn khớp số dư trên trang chủ.
function buildLedger(account: Account): Transaction[] {
  const now = Date.now();
  let balance = account.balance;
  return mockTransactionSeeds
    .filter((seed) => seed.accountId === account.id)
    .map((seed) => ({ seed, time: seedTime(seed, now) }))
    .sort((a, b) => b.time - a.time)
    .map(({ seed, time }, index) => {
      const { ago: _ago, ...fields } = seed;
      const tx: Transaction = {
        ...fields,
        id: `${account.id}-seed-${index}`,
        createdAt: new Date(time).toISOString(),
        balanceAfter: balance,
        reference: makeReference(seed.category, time),
        fee: 0,
      };
      balance -= signed(tx);
      return tx;
    });
}

function ledgerOf(account: Account): Transaction[] {
  let ledger = ledgers.get(account.id);
  if (!ledger) {
    ledger = buildLedger(account);
    ledgers.set(account.id, ledger);
  }
  return ledger;
}

/** Khoảng ngày lịch → mốc thời gian [đầu ngày `from`, đầu ngày sau `to`). */
function bounds(range: DateRange): [number, number] {
  return [parseISODate(range.from).getTime(), parseISODate(range.to).getTime() + DAY_MS];
}

function inRange(tx: Transaction, [start, end]: [number, number]): boolean {
  const time = Date.parse(tx.createdAt);
  return time >= start && time < end;
}

/** Số dư ngay trước thời điểm `time`: số dư sau giao dịch gần nhất trước mốc đó. */
function balanceBefore(ledger: Transaction[], time: number, account: Account): number {
  const latest = ledger.find((tx) => Date.parse(tx.createdAt) < time);
  if (latest) return latest.balanceAfter;
  const oldest = ledger[ledger.length - 1];
  return oldest ? oldest.balanceAfter - signed(oldest) : account.balance;
}

function accountOf(userId: string, accountId: string): Account | undefined {
  return userId ? mockAccounts.find((a) => a.id === accountId) : undefined;
}

export async function getTransactions(req: GetTransactionsRequest): Promise<GetTransactionsResponse> {
  const account = accountOf(req.userId, req.accountId);
  if (!account) return { success: false, items: [], message: 'Tài khoản không hợp lệ.' };
  if (req.from > req.to) return { success: false, items: [], message: 'Khoảng thời gian không hợp lệ.' };
  await delay(MOCK_DELAY_MS);
  const range = bounds(req);
  return { success: true, items: ledgerOf(account).filter((tx) => inRange(tx, range)) };
}

export async function getStatement(req: GetStatementRequest): Promise<GetStatementResponse> {
  const account = accountOf(req.userId, req.accountId);
  if (!account) return { success: false, message: 'Tài khoản không hợp lệ.' };
  if (req.from > req.to) return { success: false, message: 'Khoảng thời gian không hợp lệ.' };
  await delay(MOCK_DELAY_MS);
  const ledger = ledgerOf(account);
  const range = bounds(req);
  const items = ledger.filter((tx) => inRange(tx, range)).reverse();
  const incoming = items.filter((tx) => tx.type === 'in');
  const outgoing = items.filter((tx) => tx.type === 'out');
  return {
    success: true,
    statement: {
      accountId: account.id,
      accountLabel: account.label,
      accountNumber: account.number,
      holderName: toCardName(mockUser.fullName),
      from: req.from,
      to: req.to,
      openingBalance: balanceBefore(ledger, range[0], account),
      closingBalance: balanceBefore(ledger, range[1], account),
      totalIn: incoming.reduce((sum, tx) => sum + tx.amount, 0),
      totalOut: outgoing.reduce((sum, tx) => sum + tx.amount, 0),
      countIn: incoming.length,
      countOut: outgoing.length,
      items,
      generatedAt: new Date().toISOString(),
    },
  };
}

export type NewTransaction = Pick<
  Transaction,
  'accountId' | 'type' | 'category' | 'amount' | 'counterpartyName' | 'counterpartyBank' | 'counterpartyAccount' | 'description'
> & { reference?: string };

/**
 * Xử lý nội bộ của server giả lập (không phải API): ghi giao dịch vừa hoàn tất vào sổ và cộng/trừ số dư tài khoản.
 * Chuyển khoản và thanh toán hóa đơn gọi hàm này sau khi xác thực OTP thành công.
 */
export function recordTransaction(input: NewTransaction): Transaction | undefined {
  const account = mockAccounts.find((a) => a.id === input.accountId);
  if (!account) return undefined;
  // Dựng sổ từ dữ liệu mẫu trước khi đổi số dư, để các giao dịch mẫu vẫn khớp số dư cũ.
  const ledger = ledgerOf(account);
  const now = Date.now();
  const { reference, ...fields } = input;
  account.balance += signed(input);
  const tx: Transaction = {
    ...fields,
    id: `${account.id}-${now}-${sequence + 1}`,
    createdAt: new Date(now).toISOString(),
    balanceAfter: account.balance,
    reference: reference ?? makeReference(input.category, now),
    fee: 0,
  };
  ledger.unshift(tx);
  return tx;
}
