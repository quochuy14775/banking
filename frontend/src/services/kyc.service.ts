import { MOCK_CCCD_QR } from '@/shared/lib/mockData';
import type { KycProfile, SubmitKycRequest, SubmitKycResponse, User } from '@/models';

// Server kiểm tra người thật và so khớp khuôn mặt nên lâu hơn các API khác một chút.
const MOCK_DELAY_MS = 1200;
const DEMO_SELFIE = 'demo-selfie';

// Kết quả eKYC theo người dùng, lưu trong bộ nhớ (mock). Khi có BE: server đối chiếu dữ liệu CCCD với
// chủ tài khoản và cơ sở dữ liệu quốc gia, rồi trả trạng thái xác thực trong hồ sơ người dùng.
const verifiedProfiles = new Map<string, KycProfile>();

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// Chỉ dùng cho bản demo: nội dung mã QR của CCCD mẫu để thử luồng khi không có thẻ thật. Bỏ khi có BE thật.
export function getDemoCccdQrPayload(): string {
  return MOCK_CCCD_QR;
}

// Chỉ dùng cho bản demo: thay ảnh khuôn mặt thật khi thử luồng trên web hoặc máy ảo không có camera.
export function getDemoSelfie(): string {
  return DEMO_SELFIE;
}

// Khi có BE: gửi ảnh (và các khung hình lúc làm theo hướng dẫn) lên server hoặc SDK eKYC để kiểm tra
// người thật (chống dùng ảnh/video giả) và so khớp với ảnh trong cơ sở dữ liệu quốc gia hoặc trên chip CCCD.
// Ảnh khuôn mặt chỉ gửi đi, không lưu lại trên máy.
export async function submitKyc(req: SubmitKycRequest): Promise<SubmitKycResponse> {
  if (!req.userId) return { success: false, message: 'Thiếu thông tin người dùng.' };
  if (!req.consent) return { success: false, message: 'Bạn cần đồng ý xử lý dữ liệu cá nhân để xác thực.' };
  if (!req.selfie) return { success: false, message: 'Chưa có ảnh khuôn mặt, vui lòng chụp lại.' };
  await delay(MOCK_DELAY_MS);
  const { info } = req;
  const profile: KycProfile = {
    fullName: info.fullName,
    idNumber: info.idNumber,
    oldIdNumber: info.oldIdNumber,
    dateOfBirth: info.dateOfBirth,
    gender: info.gender,
    address: info.permanentAddress,
    idIssueDate: info.issueDate,
    kycVerified: true,
  };
  verifiedProfiles.set(req.userId, profile);
  return { success: true, profile };
}

/** Gộp kết quả eKYC đã có vào hồ sơ (mock: giữ trạng thái khi đăng nhập lại trong cùng lần chạy app). */
export function withKycProfile(user: User): User {
  const profile = verifiedProfiles.get(user.id);
  return profile ? { ...user, ...profile } : user;
}
