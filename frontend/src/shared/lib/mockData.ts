import type {
  Account,
  AppFeature,
  AppNotification,
  Bank,
  Bill,
  BillDetail,
  BillHistoryItem,
  BillProvider,
  Contact,
  FinancialHealth,
  MonthlySpending,
  SavingsGoal,
  QuickAction,
  TransactionCategory,
  TransactionType,
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

export const mockAppFeatures: AppFeature[] = [
  { id: "transfer", group: "payments", route: "/transfer", keywords: ["chuyen tien", "ck", "send money", "transfer"], popular: true },
  { id: "qrScan", group: "payments", route: "/qr", keywords: ["quet ma", "qr pay", "scan", "thanh toan qr"], popular: true },
  { id: "qrReceive", group: "payments", route: "/profile", keywords: ["ma qr nhan tien", "receive", "nhan tien"] },
  { id: "topup", group: "payments", keywords: ["nap the", "nap dt", "dien thoai", "top up", "mobile"] },
  { id: "bills", group: "payments", route: "/bills", keywords: ["hoa don", "dien", "nuoc", "internet", "bill", "pay bill"], popular: true },
  { id: "history", group: "accounts", route: "/history", keywords: ["lich su", "giao dich", "bien dong", "history", "transactions"], popular: true },
  { id: "statement", group: "accounts", route: "/statement", keywords: ["sao ke", "xuat pdf", "statement", "bank statement"] },
  { id: "exchange", group: "accounts", keywords: ["ty gia", "ngoai te", "usd", "exchange rate", "fx"] },
  { id: "budget", group: "accounts", keywords: ["chi tieu", "ngan sach", "budget", "spending"] },
  { id: "goals", group: "accounts", keywords: ["muc tieu", "tiet kiem", "goal", "saving"] },
  { id: "cards", group: "cards", keywords: ["the", "the tin dung", "card", "visa"] },
  { id: "cardLock", group: "cards", keywords: ["khoa the", "mo the", "lock card", "freeze"] },
  { id: "changePin", group: "cards", keywords: ["doi pin", "ma pin", "change pin"] },
  { id: "profile", group: "personal", route: "/profile", keywords: ["ho so", "ca nhan", "thong tin", "profile", "account"] },
  { id: "ekyc", group: "personal", route: "/kyc", keywords: ["dinh danh", "ekyc", "cccd", "xac thuc", "identity"] },
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
  memberSince: "2024",
  // Chưa xác thực eKYC: số CCCD, ngày sinh, giới tính, nơi thường trú được điền khi quét mã QR trên CCCD.
  kycVerified: false,
};

// Nội dung mã QR mặt trước CCCD của người dùng demo (nút "Dùng CCCD mẫu" ở màn eKYC).
// Định dạng: số CCCD|số CMND cũ|họ tên|ngày sinh|giới tính|nơi thường trú|ngày cấp (ngày dạng ddMMyyyy).
export const MOCK_CCCD_QR =
  "079203004521|025123456|Nguyễn Văn An|15032003|Nam|12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh|20082021";

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

// Ngân hàng của app demo. BIN 970999 là số giả, không thuộc ngân hàng thật nào,
// nên app ngân hàng thật quét mã QR nhận tiền của app sẽ không chuyển nhầm tiền đi đâu.
export const APP_BANK: Bank = {
  code: "VB",
  bin: "970999",
  shortName: "VietBank (demo)",
  name: "Ngân hàng demo VietBank",
};

// Danh sách ngân hàng phổ biến (chưa đầy đủ); sau này là bảng `banks` phía BE.
// Logo đóng gói sẵn theo mã ở `constants/bank-logos`; khi có BE thì API trả thêm `logo` (URL).
export const mockBanks: Bank[] = [
  { code: "VCB", bin: "970436", shortName: "Vietcombank", name: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { code: "BIDV", bin: "970418", shortName: "BIDV", name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam" },
  { code: "ICB", bin: "970415", shortName: "VietinBank", name: "Ngân hàng TMCP Công thương Việt Nam" },
  { code: "VBA", bin: "970405", shortName: "Agribank", name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam" },
  { code: "TCB", bin: "970407", shortName: "Techcombank", name: "Ngân hàng TMCP Kỹ thương Việt Nam" },
  { code: "MB", bin: "970422", shortName: "MB Bank", name: "Ngân hàng TMCP Quân đội" },
  { code: "ACB", bin: "970416", shortName: "ACB", name: "Ngân hàng TMCP Á Châu" },
  { code: "VPB", bin: "970432", shortName: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { code: "TPB", bin: "970423", shortName: "TPBank", name: "Ngân hàng TMCP Tiên Phong" },
  { code: "STB", bin: "970403", shortName: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { code: "HDB", bin: "970437", shortName: "HDBank", name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh" },
  { code: "VIB", bin: "970441", shortName: "VIB", name: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { code: "SHB", bin: "970443", shortName: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { code: "EIB", bin: "970431", shortName: "Eximbank", name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam" },
  { code: "MSB", bin: "970426", shortName: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam" },
  { code: "OCB", bin: "970448", shortName: "OCB", name: "Ngân hàng TMCP Phương Đông" },
  { code: "SEAB", bin: "970440", shortName: "SeABank", name: "Ngân hàng TMCP Đông Nam Á" },
  { code: "LPB", bin: "970449", shortName: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam" },
  { code: "SCB", bin: "970429", shortName: "SCB", name: "Ngân hàng TMCP Sài Gòn" },
  { code: "NAB", bin: "970428", shortName: "Nam A Bank", name: "Ngân hàng TMCP Nam Á" },
  { code: "ABB", bin: "970425", shortName: "ABBANK", name: "Ngân hàng TMCP An Bình" },
  { code: "BAB", bin: "970409", shortName: "Bac A Bank", name: "Ngân hàng TMCP Bắc Á" },
  { code: "PGB", bin: "970430", shortName: "PGBank", name: "Ngân hàng TMCP Thịnh vượng và Phát triển" },
  { code: "KLB", bin: "970452", shortName: "KienlongBank", name: "Ngân hàng TMCP Kiên Long" },
  { code: "VAB", bin: "970427", shortName: "VietABank", name: "Ngân hàng TMCP Việt Á" },
  { code: "NCB", bin: "970419", shortName: "NCB", name: "Ngân hàng TMCP Quốc Dân" },
  { code: "BVB", bin: "970438", shortName: "BaoViet Bank", name: "Ngân hàng TMCP Bảo Việt" },
  { code: "SGICB", bin: "970400", shortName: "SaigonBank", name: "Ngân hàng TMCP Sài Gòn Công Thương" },
];

export const mockContacts: Contact[] = [
  { id: "c1", name: "Trần Thị Bình", bank: "Vietcombank", number: "0071 0012 3456" },
  { id: "c2", name: "Lê Hoàng Cường", bank: "Techcombank", number: "1902 4455 6677" },
  { id: "c3", name: "Phạm Thu Hà", bank: "MB Bank", number: "0333 8899 0011" },
];

// Tài khoản tra cứu được khi nhập tay (bất kỳ ngân hàng); số khác trả về "không tìm thấy".
// Tên viết hoa không dấu giống tên chủ tài khoản ngân hàng thật trả về.
export const mockAccountDirectory: { number: string; name: string }[] = [
  { number: "0123456789", name: "NGUYEN MINH TUAN" },
  { number: "1900123456", name: "TRAN THI LAN" },
  { number: "0987654321", name: "PHAM QUOC VIET" },
  { number: "6868686868", name: "DO THI HUONG" },
  // Tài khoản của chính người dùng demo, để quét mã QR nhận tiền của mình cũng tra được tên.
  { number: "190388881234", name: "NGUYEN VAN AN" },
];

export const MOCK_OTP = "123456";

/**
 * Giao dịch mẫu theo tài khoản. Thời điểm tính lùi từ lúc mở app: `minutes` cho giao dịch gần đây, `days` + `at`
 * (giờ:phút) cho các ngày trước. Số dư sau từng giao dịch do transaction.service tính lùi từ số dư hiện tại
 * của tài khoản, nên luôn khớp với số dư đang hiện trên trang chủ.
 */
export interface TransactionSeed {
  accountId: string;
  ago: { minutes: number } | { days: number; at: string };
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  counterpartyName: string;
  counterpartyBank?: string;
  counterpartyAccount?: string;
  description: string;
}

const PAYMENT_ACCOUNT = "acc-1";
const SAVINGS_ACCOUNT = "acc-2";
const SALARY = { counterpartyName: "CONG TY ABC", counterpartyBank: "Techcombank", counterpartyAccount: "1902 4455 6677" };
const LANDLORD = { counterpartyName: "DO THI HUONG", counterpartyBank: "ACB", counterpartyAccount: "6868686868" };
const TO_SAVINGS = { counterpartyName: "NGUYEN VAN AN", counterpartyBank: APP_BANK.shortName, counterpartyAccount: "1903 8888 5678" };
const FROM_PAYMENT = { counterpartyName: "NGUYEN VAN AN", counterpartyBank: APP_BANK.shortName, counterpartyAccount: "1903 8888 1234" };

export const mockTransactionSeeds: TransactionSeed[] = [
  // Năm giao dịch mới nhất khớp với thông báo biến động số dư (cùng thời điểm, số tiền, số dư sau giao dịch).
  { accountId: PAYMENT_ACCOUNT, ago: { minutes: 5 }, type: "in", category: "transfer", amount: 2500000, counterpartyName: "NGUYEN VAN A", counterpartyBank: "Vietcombank", counterpartyAccount: "0071 0012 3456", description: "NGUYEN VAN A chuyen tien" },
  { accountId: PAYMENT_ACCOUNT, ago: { minutes: 3 * HOUR }, type: "out", category: "bill", amount: 850000, counterpartyName: "EVN HCMC", description: "Thanh toan hoa don dien thang 10" },
  { accountId: PAYMENT_ACCOUNT, ago: { minutes: DAY + 2 * HOUR }, type: "in", category: "salary", amount: 18000000, ...SALARY, description: "Luong thang 10/2026" },
  { accountId: PAYMENT_ACCOUNT, ago: { minutes: 2 * DAY + 4 * HOUR }, type: "out", category: "transfer", amount: 2000000, counterpartyName: "TRAN THI BINH", counterpartyBank: "Vietcombank", counterpartyAccount: "0071 0099 8877", description: "Chuyen tien an trua" },
  { accountId: PAYMENT_ACCOUNT, ago: { minutes: 4 * DAY }, type: "out", category: "payment", amount: 120000, counterpartyName: "GRAB", description: "Thanh toan QR GrabFood" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 5, at: "19:40" }, type: "out", category: "payment", amount: 350000, counterpartyName: "HIGHLANDS COFFEE", description: "Thanh toan QR Highlands Coffee" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 6, at: "08:15" }, type: "out", category: "topup", amount: 200000, counterpartyName: "VINAPHONE", description: "Nap tien dien thoai 0912345678" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 7, at: "12:05" }, type: "out", category: "transfer", amount: 1500000, counterpartyName: "LE HOANG CUONG", counterpartyBank: "Techcombank", counterpartyAccount: "1902 4455 6677", description: "Tra tien ve may bay" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 8, at: "21:30" }, type: "out", category: "payment", amount: 450000, counterpartyName: "SHOPEE", description: "Thanh toan don hang Shopee" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 9, at: "07:50" }, type: "out", category: "cash", amount: 2000000, counterpartyName: "ATM VIETBANK NGUYEN HUE", description: "Rut tien mat tai ATM" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 10, at: "18:20" }, type: "in", category: "transfer", amount: 500000, counterpartyName: "PHAM THU HA", counterpartyBank: "MB Bank", counterpartyAccount: "0333 8899 0011", description: "Tra tien ve xem phim" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 12, at: "10:00" }, type: "out", category: "savings", amount: 5000000, ...TO_SAVINGS, description: "Chuyen tien vao tai khoan tiet kiem" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 14, at: "13:10" }, type: "out", category: "bill", amount: 186300, counterpartyName: "SAWACO", description: "Thanh toan hoa don nuoc thang 9" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 15, at: "20:45" }, type: "out", category: "payment", amount: 680000, counterpartyName: "BACH HOA XANH", description: "Thanh toan the tai Bach Hoa Xanh" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 17, at: "09:30" }, type: "in", category: "transfer", amount: 1200000, counterpartyName: "NGUYEN MINH TUAN", counterpartyBank: "BIDV", counterpartyAccount: "2101 4455 8899", description: "Hoan tien tien nha" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 19, at: "11:00" }, type: "out", category: "bill", amount: 175000, counterpartyName: "TRUYEN HINH K+", description: "Thanh toan hoa don K+ thang 10" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 21, at: "08:40" }, type: "out", category: "transfer", amount: 300000, counterpartyName: "TRAN THI LAN", counterpartyBank: "Techcombank", counterpartyAccount: "1900123456", description: "Gui tien mua sach" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 22, at: "19:15" }, type: "out", category: "payment", amount: 250000, counterpartyName: "CGV CINEMAS", description: "Thanh toan QR CGV Cinemas" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 24, at: "12:30" }, type: "out", category: "transfer", amount: 3200000, ...LANDLORD, description: "Tien nha thang 11" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 26, at: "07:45" }, type: "out", category: "topup", amount: 50000, counterpartyName: "VIETTEL", description: "Nap tien dien thoai 0961234567" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 28, at: "16:00" }, type: "in", category: "payment", amount: 300000, counterpartyName: "VIETBANK", description: "Hoan tien 10% thanh toan QR" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 32, at: "09:00" }, type: "in", category: "salary", amount: 18000000, ...SALARY, description: "Luong thang 9/2026" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 33, at: "12:30" }, type: "out", category: "transfer", amount: 3200000, ...LANDLORD, description: "Tien nha thang 10" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 35, at: "19:20" }, type: "out", category: "payment", amount: 650000, counterpartyName: "CO.OPMART", description: "Thanh toan the tai Co.opmart" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 37, at: "08:10" }, type: "out", category: "cash", amount: 2000000, counterpartyName: "ATM VIETBANK LE LOI", description: "Rut tien mat tai ATM" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 39, at: "10:15" }, type: "out", category: "bill", amount: 812000, counterpartyName: "EVN HCMC", description: "Thanh toan hoa don dien thang 9" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 41, at: "10:00" }, type: "out", category: "savings", amount: 5000000, ...TO_SAVINGS, description: "Chuyen tien vao tai khoan tiet kiem" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 44, at: "09:05" }, type: "out", category: "bill", amount: 250000, counterpartyName: "FPT TELECOM", description: "Thanh toan cuoc Internet thang 10" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 46, at: "21:10" }, type: "in", category: "transfer", amount: 750000, counterpartyName: "LE HOANG CUONG", counterpartyBank: "Techcombank", counterpartyAccount: "1902 4455 6677", description: "Tra tien an toi" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 48, at: "18:30" }, type: "out", category: "payment", amount: 420000, counterpartyName: "GRAB", description: "Thanh toan GrabCar" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 50, at: "08:00" }, type: "out", category: "topup", amount: 100000, counterpartyName: "VINAPHONE", description: "Nap tien dien thoai 0912345678" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 53, at: "14:25" }, type: "out", category: "transfer", amount: 1800000, counterpartyName: "PHAM THU HA", counterpartyBank: "MB Bank", counterpartyAccount: "0333 8899 0011", description: "Gop tien sinh nhat" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 56, at: "22:10" }, type: "out", category: "payment", amount: 990000, counterpartyName: "SHOPEE", description: "Thanh toan don hang Shopee" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 59, at: "13:00" }, type: "out", category: "bill", amount: 172500, counterpartyName: "SAWACO", description: "Thanh toan hoa don nuoc thang 8" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 62, at: "09:00" }, type: "in", category: "salary", amount: 18000000, ...SALARY, description: "Luong thang 8/2026" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 63, at: "12:00" }, type: "out", category: "transfer", amount: 3200000, ...LANDLORD, description: "Tien nha thang 9" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 66, at: "17:45" }, type: "out", category: "cash", amount: 1500000, counterpartyName: "ATM VIETBANK NGUYEN HUE", description: "Rut tien mat tai ATM" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 68, at: "10:20" }, type: "out", category: "bill", amount: 780000, counterpartyName: "EVN HCMC", description: "Thanh toan hoa don dien thang 8" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 70, at: "10:00" }, type: "out", category: "savings", amount: 5000000, ...TO_SAVINGS, description: "Chuyen tien vao tai khoan tiet kiem" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 72, at: "19:40" }, type: "out", category: "payment", amount: 560000, counterpartyName: "BACH HOA XANH", description: "Thanh toan the tai Bach Hoa Xanh" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 75, at: "09:10" }, type: "out", category: "bill", amount: 250000, counterpartyName: "FPT TELECOM", description: "Thanh toan cuoc Internet thang 9" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 77, at: "20:00" }, type: "in", category: "transfer", amount: 2000000, counterpartyName: "NGUYEN MINH TUAN", counterpartyBank: "BIDV", counterpartyAccount: "2101 4455 8899", description: "Tra no thang 7" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 80, at: "08:30" }, type: "out", category: "payment", amount: 320000, counterpartyName: "THE COFFEE HOUSE", description: "Thanh toan QR The Coffee House" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 84, at: "15:15" }, type: "out", category: "transfer", amount: 2500000, counterpartyName: "TRAN THI BINH", counterpartyBank: "Vietcombank", counterpartyAccount: "0071 0099 8877", description: "Mung cuoi" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 88, at: "07:30" }, type: "out", category: "topup", amount: 150000, counterpartyName: "VINAPHONE", description: "Nap tien dien thoai 0912345678" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 93, at: "09:00" }, type: "in", category: "salary", amount: 18000000, ...SALARY, description: "Luong thang 7/2026" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 94, at: "12:10" }, type: "out", category: "transfer", amount: 3200000, ...LANDLORD, description: "Tien nha thang 8" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 97, at: "21:00" }, type: "out", category: "payment", amount: 1200000, counterpartyName: "SHOPEE", description: "Thanh toan don hang Shopee" },
  { accountId: PAYMENT_ACCOUNT, ago: { days: 100, at: "08:45" }, type: "out", category: "cash", amount: 2000000, counterpartyName: "ATM VIETBANK LE LOI", description: "Rut tien mat tai ATM" },
  // Tài khoản tiết kiệm: tiền chuyển từ tài khoản thanh toán (khớp các giao dịch "savings" ở trên) và lãi đầu tháng.
  { accountId: SAVINGS_ACCOUNT, ago: { days: 12, at: "10:00" }, type: "in", category: "savings", amount: 5000000, ...FROM_PAYMENT, description: "Chuyen tien tu tai khoan thanh toan" },
  { accountId: SAVINGS_ACCOUNT, ago: { days: 12, at: "00:05" }, type: "in", category: "interest", amount: 545000, counterpartyName: "VIETBANK", description: "Tra lai tien gui thang 10" },
  { accountId: SAVINGS_ACCOUNT, ago: { days: 41, at: "10:00" }, type: "in", category: "savings", amount: 5000000, ...FROM_PAYMENT, description: "Chuyen tien tu tai khoan thanh toan" },
  { accountId: SAVINGS_ACCOUNT, ago: { days: 43, at: "00:05" }, type: "in", category: "interest", amount: 520000, counterpartyName: "VIETBANK", description: "Tra lai tien gui thang 9" },
  { accountId: SAVINGS_ACCOUNT, ago: { days: 70, at: "10:00" }, type: "in", category: "savings", amount: 5000000, ...FROM_PAYMENT, description: "Chuyen tien tu tai khoan thanh toan" },
  { accountId: SAVINGS_ACCOUNT, ago: { days: 73, at: "00:05" }, type: "in", category: "interest", amount: 498000, counterpartyName: "VIETBANK", description: "Tra lai tien gui thang 8" },
  { accountId: SAVINGS_ACCOUNT, ago: { days: 104, at: "00:05" }, type: "in", category: "interest", amount: 480000, counterpartyName: "VIETBANK", description: "Tra lai tien gui thang 7" },
];

// Doanh nghiệp nhận thanh toán hoá đơn (dữ liệu demo).
export const mockBillProviders: BillProvider[] = [
  { id: "evn-hcmc", category: "electricity", name: "Tổng công ty Điện lực TP.HCM", shortName: "EVNHCMC", badge: "EVN", color: "#F59E0B", codeHint: "PE0400123456" },
  { id: "evn-hn", category: "electricity", name: "Tổng công ty Điện lực TP. Hà Nội", shortName: "EVNHANOI", badge: "EVN", color: "#EA580C", codeHint: "PD1300456789" },
  { id: "sawaco", category: "water", name: "Tổng công ty Cấp nước Sài Gòn", shortName: "SAWACO", badge: "SWC", color: "#0284C7", codeHint: "13579246" },
  { id: "hawacom", category: "water", name: "Công ty Nước sạch Hà Nội", shortName: "HAWACOM", badge: "HWC", color: "#0891B2", codeHint: "24681357" },
  { id: "fpt-telecom", category: "internet", name: "Công ty Cổ phần Viễn thông FPT", shortName: "FPT Telecom", badge: "FPT", color: "#F97316", codeHint: "SGH512345" },
  { id: "viettel-net", category: "internet", name: "Viettel Telecom – Internet", shortName: "Viettel", badge: "VTL", color: "#DC2626", codeHint: "HCM_FTTH_8812" },
  { id: "vnpt-net", category: "internet", name: "VNPT – Internet cáp quang", shortName: "VNPT", badge: "VNPT", color: "#2563EB", codeHint: "HNI0099887" },
  { id: "kplus", category: "tv", name: "Truyền hình K+", shortName: "K+", badge: "K+", color: "#111827", codeHint: "1234567890" },
  { id: "vtvcab", category: "tv", name: "Truyền hình cáp Việt Nam VTVcab", shortName: "VTVcab", badge: "VTV", color: "#7C3AED", codeHint: "VC20261234" },
  { id: "viettel-post", category: "mobile", name: "Viettel – Di động trả sau", shortName: "Viettel", badge: "VTL", color: "#DC2626", codeHint: "0961234567" },
  { id: "vinaphone-post", category: "mobile", name: "VinaPhone – Di động trả sau", shortName: "VinaPhone", badge: "VNP", color: "#0EA5E9", codeHint: "0912345678" },
  { id: "mobifone-post", category: "mobile", name: "MobiFone – Di động trả sau", shortName: "MobiFone", badge: "MBF", color: "#1D4ED8", codeHint: "0901234567" },
  { id: "fptu", category: "tuition", name: "Trường Đại học FPT", shortName: "FPTU", badge: "FPTU", color: "#F97316", codeHint: "SE180001" },
  { id: "hcmut", category: "tuition", name: "Trường ĐH Bách khoa – ĐHQG TP.HCM", shortName: "HCMUT", badge: "BK", color: "#1E3A8A", codeHint: "2311234" },
  { id: "baoviet-life", category: "insurance", name: "Tổng công ty Bảo Việt Nhân thọ", shortName: "Bảo Việt Nhân thọ", badge: "BVNT", color: "#1D4ED8", codeHint: "HD20260001" },
  { id: "prudential", category: "insurance", name: "Công ty TNHH Bảo hiểm Nhân thọ Prudential Việt Nam", shortName: "Prudential", badge: "PRU", color: "#DC2626", codeHint: "PRU7788990" },
];

// Kỳ hoá đơn đang nợ theo mã khách hàng. `paid: true` = kỳ này đã thanh toán, tra cứu sẽ báo không còn nợ.
export const mockBillDirectory: (BillDetail & { paid?: boolean })[] = [
  { id: "bill-evn-1", providerId: "evn-hcmc", customerCode: "PE0400123456", customerName: "NGUYEN VAN AN", address: "12 Nguyễn Huệ, Quận 1, TP.HCM", period: "Tháng 10/2026", dueDate: "2026-11-05", amount: 856400 },
  { id: "bill-evn-2", providerId: "evn-hcmc", customerCode: "PE0400987654", customerName: "TRAN THI BINH", address: "45 Lê Lợi, Quận 1, TP.HCM", period: "Tháng 10/2026", dueDate: "2026-10-30", amount: 1245000 },
  { id: "bill-evnhn-1", providerId: "evn-hn", customerCode: "PD1300456789", customerName: "LE HOANG CUONG", address: "88 Láng Hạ, Đống Đa, Hà Nội", period: "Tháng 10/2026", dueDate: "2026-11-08", amount: 642000 },
  { id: "bill-evnhn-2", providerId: "evn-hn", customerCode: "PD1300000001", customerName: "PHAM THU HA", address: "21 Kim Mã, Ba Đình, Hà Nội", period: "Tháng 10/2026", dueDate: "2026-11-08", amount: 503000, paid: true },
  { id: "bill-sawaco-1", providerId: "sawaco", customerCode: "13579246", customerName: "NGUYEN VAN AN", address: "12 Nguyễn Huệ, Quận 1, TP.HCM", period: "Tháng 10/2026", dueDate: "2026-11-10", amount: 186300 },
  { id: "bill-hawacom-1", providerId: "hawacom", customerCode: "24681357", customerName: "PHAM THU HA", address: "21 Kim Mã, Ba Đình, Hà Nội", period: "Tháng 10/2026", dueDate: "2026-11-12", amount: 214500 },
  { id: "bill-fpt-1", providerId: "fpt-telecom", customerCode: "SGH512345", customerName: "NGUYEN VAN AN", address: "12 Nguyễn Huệ, Quận 1, TP.HCM", period: "Tháng 11/2026", dueDate: "2026-10-30", amount: 250000 },
  { id: "bill-viettel-net-1", providerId: "viettel-net", customerCode: "HCM_FTTH_8812", customerName: "DO THI HUONG", address: "7 Võ Văn Tần, Quận 3, TP.HCM", period: "Tháng 11/2026", dueDate: "2026-11-03", amount: 230000 },
  { id: "bill-vnpt-1", providerId: "vnpt-net", customerCode: "HNI0099887", customerName: "VU DINH LONG", address: "15 Trần Duy Hưng, Cầu Giấy, Hà Nội", period: "Tháng 11/2026", dueDate: "2026-11-05", amount: 199000 },
  { id: "bill-kplus-1", providerId: "kplus", customerCode: "1234567890", customerName: "NGUYEN VAN AN", address: "12 Nguyễn Huệ, Quận 1, TP.HCM", period: "Tháng 11/2026", dueDate: "2026-11-01", amount: 175000 },
  { id: "bill-vtvcab-1", providerId: "vtvcab", customerCode: "VC20261234", customerName: "NGO THI MAI", address: "3 Hai Bà Trưng, Hoàn Kiếm, Hà Nội", period: "Tháng 11/2026", dueDate: "2026-11-06", amount: 120000 },
  { id: "bill-viettel-post-1", providerId: "viettel-post", customerCode: "0961234567", customerName: "TRAN THI LAN", address: "Thuê bao trả sau", period: "Tháng 10/2026", dueDate: "2026-11-15", amount: 312000 },
  { id: "bill-vina-1", providerId: "vinaphone-post", customerCode: "0912345678", customerName: "NGUYEN VAN AN", address: "Thuê bao trả sau", period: "Tháng 10/2026", dueDate: "2026-11-15", amount: 289000 },
  { id: "bill-mobi-1", providerId: "mobifone-post", customerCode: "0901234567", customerName: "PHAM QUOC VIET", address: "Thuê bao trả sau", period: "Tháng 10/2026", dueDate: "2026-11-15", amount: 157000 },
  { id: "bill-fptu-1", providerId: "fptu", customerCode: "SE180001", customerName: "NGUYEN VAN AN", address: "Học phí học kỳ Fall 2026", period: "Học kỳ Fall 2026", dueDate: "2026-11-20", amount: 28700000 },
  { id: "bill-hcmut-1", providerId: "hcmut", customerCode: "2311234", customerName: "DO THI HUONG", address: "Học phí học kỳ 1, năm học 2026–2027", period: "HK1 2026–2027", dueDate: "2026-11-25", amount: 15600000 },
  { id: "bill-bvnt-1", providerId: "baoviet-life", customerCode: "HD20260001", customerName: "NGUYEN VAN AN", address: "Hợp đồng An Phát Trọn Đời", period: "Phí năm 2026–2027", dueDate: "2026-11-18", amount: 12500000 },
  { id: "bill-pru-1", providerId: "prudential", customerCode: "PRU7788990", customerName: "TRAN THI LAN", address: "Hợp đồng PRU-Đầu Tư Linh Hoạt", period: "Phí quý IV/2026", dueDate: "2026-11-20", amount: 3800000 },
];

// Hóa đơn người dùng demo đã thanh toán trước đó (mục "Đã thanh toán gần đây").
export const mockBillHistory: BillHistoryItem[] = [
  { id: "paid-kplus-10", providerId: "kplus", label: "Truyền hình K+", period: "Tháng 10/2026", amount: 175000, paidAt: "2026-10-25" },
  { id: "paid-evn-09", providerId: "evn-hcmc", label: "Điện nhà", period: "Tháng 9/2026", amount: 812000, paidAt: "2026-10-05" },
  { id: "paid-fpt-10", providerId: "fpt-telecom", label: "Internet nhà", period: "Tháng 10/2026", amount: 250000, paidAt: "2026-09-30" },
];

// Hoá đơn người dùng demo đã lưu (hiện ở đầu màn Thanh toán hoá đơn).
export const mockSavedBills: { providerId: string; customerCode: string; label: string }[] = [
  { providerId: "evn-hcmc", customerCode: "PE0400123456", label: "Điện nhà" },
  { providerId: "fpt-telecom", customerCode: "SGH512345", label: "Internet nhà" },
  { providerId: "sawaco", customerCode: "13579246", label: "Nước nhà" },
  { providerId: "vinaphone-post", customerCode: "0912345678", label: "Di động" },
];

export const mockBills: Bill[] = [
  { id: "b1", name: "Internet FPT", dueLabel: "Còn 2 ngày", amount: 250000 },
  { id: "b2", name: "Điện lực EVN", dueLabel: "Còn 4 ngày", amount: 620000 },
  { id: "b3", name: "Netflix", dueLabel: "Còn 7 ngày", amount: 99000 },
];

// Chi tiêu theo danh mục (dữ liệu demo); tháng tính theo ngày hiện tại của máy.
const monthStart = (offset: number) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export const mockSpendingMonths: { current: MonthlySpending; previous: MonthlySpending } = {
  current: {
    month: monthStart(0),
    total: 14200000,
    categories: [
      { key: "food", amount: 5400000, previousAmount: 4200000 },
      { key: "housing", amount: 3100000, previousAmount: 3100000 },
      { key: "transport", amount: 2600000, previousAmount: 2950000 },
      { key: "shopping", amount: 1900000, previousAmount: 1800000 },
      { key: "other", amount: 1200000, previousAmount: 1050000 },
    ],
  },
  previous: {
    month: monthStart(-1),
    total: 13100000,
    categories: [
      { key: "food", amount: 4200000, previousAmount: 4380000 },
      { key: "housing", amount: 3100000, previousAmount: 3100000 },
      { key: "transport", amount: 2950000, previousAmount: 2700000 },
      { key: "shopping", amount: 1800000, previousAmount: 2250000 },
      { key: "other", amount: 1050000, previousAmount: 1000000 },
    ],
  },
};

export const MOCK_MONTHLY_BUDGET = 20000000;

export const mockSavingsGoals: SavingsGoal[] = [
  { id: "goal-danang", name: "Đà Nẵng tháng 2", icon: "travel", saved: 12000000, target: 20000000, startDate: "2026-08-01", deadline: "2027-02-01" },
  { id: "goal-emergency", name: "Quỹ khẩn cấp", icon: "emergency", saved: 30000000, target: 60000000, startDate: "2026-01-01", deadline: "2027-05-01" },
];
