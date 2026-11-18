package vn.corebank.auth.domain.port;

import java.util.UUID;

/**
 * Hỏi customer-service về hồ sơ đăng ký của khách. Là interface để tầng application không phụ thuộc cách gọi HTTP,
 * và để test thay được bằng bản giả.
 */
public interface CustomerDirectory {

    /**
     * Trả về mã khách hàng (customerId) nếu hồ sơ {@code applicationId} đã được nhân viên duyệt và {@code accessCode}
     * đúng. Hồ sơ không có hoặc sai mã thì ném {@code OnboardingNotFoundException}; chưa duyệt thì
     * {@code OnboardingNotApprovedException}.
     */
    UUID verifyApprovedApplicant(UUID applicationId, String accessCode);
}
