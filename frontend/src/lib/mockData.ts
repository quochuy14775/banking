import type {
  Account,
  AppNotification,
  Bill,
  FinancialHealth,
  QuickAction,
  Transaction,
  User,
} from "@/models";

export const mockFinancialHealth: FinancialHealth = {
  score: 83,
  maxScore: 100,
  message: "Bạn đang quản lý tài chính rất tốt!",
  checklist: [
    { label: "Chi tiêu hợp lý", shortLabel: "Chi tiêu hợp lý", ok: true },
    { label: "Tiết kiệm đều đặn", shortLabel: "Tiết kiệm đều đặn", ok: true },
    { label: "Chi tiêu giải trí tăng 20%", shortLabel: "Giải trí +20%", ok: false },
  ],
  trend: [
    { label: "T5", score: 62 },
    { label: "T6", score: 66 },
    { label: "T7", score: 71 },
    { label: "T8", score: 74 },
    { label: "T9", score: 78 },
    { label: "T10", score: 83 },
  ],
  percentile: 72,
};

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const HOUR = 60;
const DAY = 24 * HOUR;

export const mockNotifications: AppNotification[] = [
  {
    id: "b1",
    category: "balance",
    type: "balance_in",
    title: "+2.500.000 ₫",
    message: "Nhận tiền từ NGUYEN VAN A. Số dư: 45.230.000 ₫.",
    createdAt: minutesAgo(5),
    transaction: {
      type: "in",
      amount: 2500000,
      accountNumber: "1903 8888 1234",
      counterpartyName: "NGUYEN VAN A",
      counterpartyBank: "Vietcombank",
      counterpartyAccount: "0071 0012 3456",
      description: "NGUYEN VAN A chuyen tien",
      balanceAfter: 45230000,
    },
    read: false,
  },
  {
    id: "b2",
    category: "balance",
    type: "balance_out",
    title: "-850.000 ₫",
    message: "Thanh toán hóa đơn điện EVN. Số dư: 42.730.000 ₫.",
    createdAt: minutesAgo(3 * HOUR),
    transaction: {
      type: "out",
      amount: 850000,
      accountNumber: "1903 8888 1234",
      counterpartyName: "EVN HCMC",
      description: "Thanh toan hoa don dien thang 10",
      balanceAfter: 42730000,
    },
    read: true,
  },
  {
    id: "b3",
    category: "balance",
    type: "balance_in",
    title: "+18.000.000 ₫",
    message: "Nhận lương tháng 10 từ CONG TY ABC. Số dư: 43.580.000 ₫.",
    createdAt: minutesAgo(DAY + 2 * HOUR),
    transaction: {
      type: "in",
      amount: 18000000,
      accountNumber: "1903 8888 1234",
      counterpartyName: "CONG TY ABC",
      counterpartyBank: "Techcombank",
      counterpartyAccount: "1902 4455 6677",
      description: "Luong thang 10/2026",
      balanceAfter: 43580000,
    },
    read: false,
  },
  {
    id: "b4",
    category: "balance",
    type: "balance_out",
    title: "-2.000.000 ₫",
    message: "Chuyển khoản đến TRAN THI BINH. Số dư: 25.580.000 ₫.",
    createdAt: minutesAgo(2 * DAY + 4 * HOUR),
    transaction: {
      type: "out",
      amount: 2000000,
      accountNumber: "1903 8888 1234",
      counterpartyName: "TRAN THI BINH",
      counterpartyBank: "Vietcombank",
      counterpartyAccount: "0071 0099 8877",
      description: "Chuyen tien an trua",
      balanceAfter: 25580000,
    },
    read: true,
  },
  {
    id: "b5",
    category: "balance",
    type: "balance_out",
    title: "-120.000 ₫",
    message: "Thanh toán QR tại GRAB. Số dư: 27.580.000 ₫.",
    createdAt: minutesAgo(4 * DAY),
    transaction: {
      type: "out",
      amount: 120000,
      accountNumber: "1903 8888 1234",
      counterpartyName: "GRAB",
      description: "Thanh toan QR GrabFood",
      balanceAfter: 27580000,
    },
    read: true,
  },
  {
    id: "p1",
    category: "promotion",
    type: "promotion",
    title: "Hoàn tiền 10% khi thanh toán QR",
    message: "Tối đa 50.000 ₫ cho mỗi giao dịch, áp dụng đến hết 30/11.",
    createdAt: minutesAgo(2 * HOUR),
    read: false,
  },
  {
    id: "p2",
    category: "promotion",
    type: "promotion",
    title: "Lãi suất tiết kiệm 6%/năm",
    message: "Gửi tiết kiệm online kỳ hạn 12 tháng để nhận lãi suất ưu đãi.",
    createdAt: minutesAgo(3 * DAY),
    read: true,
  },
  {
    id: "s1",
    category: "system",
    type: "bill",
    title: "Hóa đơn sắp đến hạn",
    message: "Hóa đơn tiền điện 850.000 ₫ sẽ đến hạn thanh toán trong 2 ngày.",
    createdAt: minutesAgo(2 * HOUR + 30),
    read: false,
  },
  {
    id: "s2",
    category: "system",
    type: "goal",
    title: "Gần đạt mục tiêu",
    message: "Mục tiêu \"Du lịch Nhật Bản\" đã hoàn thành 45% chặng đường.",
    createdAt: minutesAgo(DAY + 5 * HOUR),
    read: true,
  },
  {
    id: "s3",
    category: "system",
    type: "security",
    title: "Đăng nhập từ thiết bị mới",
    message: "Tài khoản của bạn vừa đăng nhập trên một thiết bị mới tại Hà Nội.",
    createdAt: minutesAgo(2 * DAY + HOUR),
    read: true,
  },
  {
    id: "s4",
    category: "system",
    type: "system",
    title: "Bảo trì hệ thống",
    message: "Dịch vụ chuyển tiền tạm gián đoạn từ 0:00 đến 2:00 ngày 30/10.",
    createdAt: minutesAgo(5 * DAY),
    read: true,
  },
];

export const mockQuickActions: QuickAction[] = [
  { key: "topup" },
  { key: "transfer" },
  { key: "qr" },
  { key: "bills" },
  { key: "history" },
];

export const mockUser: User = {
  id: "u1",
  username: "an.nguyen",
  fullName: "Nguyễn Văn An",
  accountNumber: "1903 8888 1234",
  email: "an.nguyen@example.com",
  phone: "0912 345 678",
  idNumber: "079203004521",
  address: "12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh",
  memberSince: "2024",
  kycVerified: true,
};

export const mockAccounts: Account[] = [
  {
    id: "acc-1",
    label: "Tài khoản thanh toán",
    number: "1903 8888 1234",
    balance: 45230000,
    monthChange: 2450000,
    card: { holderName: "NGUYEN VAN AN", brand: "visa", expiry: "12/28", cardNumber: "4512 3456 7890 1234" },
  },
  {
    id: "acc-2",
    label: "Tài khoản tiết kiệm",
    number: "1903 8888 5678",
    balance: 120000000,
    interestRate: 5.5,
    maturityDate: "15/12/2026",
  },
];

export const mockTransactions: Transaction[] = [
  { id: "t1", date: "2026-07-30", type: "out", desc: "Chuyển khoản - Trần Thị Bình", amount: 2000000 },
  { id: "t2", date: "2026-07-29", type: "in", desc: "Nhận lương tháng 7", amount: 18000000 },
  { id: "t3", date: "2026-07-28", type: "out", desc: "Thanh toán hóa đơn điện", amount: 850000 },
  { id: "t4", date: "2026-07-26", type: "out", desc: "Chuyển khoản - Lê Hoàng Cường", amount: 500000 },
  { id: "t5", date: "2026-07-24", type: "in", desc: "Hoàn tiền mua sắm", amount: 120000 },
];

export const mockBills: Bill[] = [
  { id: "b1", name: "Internet FPT", dueLabel: "Còn 2 ngày", amount: 250000 },
  { id: "b2", name: "Điện lực EVN", dueLabel: "Còn 4 ngày", amount: 620000 },
  { id: "b3", name: "Netflix", dueLabel: "Còn 7 ngày", amount: 99000 },
];
