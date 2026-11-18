package vn.corebank.customer.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.corebank.common.domain.BaseEntity;

import java.time.Instant;
import java.util.UUID;

/**
 * Sự đồng ý của khách cho việc xử lý dữ liệu cá nhân, gồm ảnh CCCD và ảnh khuôn mặt, ánh xạ với bảng
 * {@code biometric_consent}. Ghi nhận cùng lúc khách gửi hồ sơ đăng ký (khi đó chưa có khách hàng).
 */
@Entity
@Table(name = "biometric_consent")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public class BiometricConsent extends BaseEntity {

    @Column(name = "application_id", nullable = false, updatable = false)
    private UUID applicationId;

    /** Phiên bản của văn bản đồng ý mà khách đã đọc, ví dụ {@code 2026-01}. */
    @Column(name = "consent_version", nullable = false, updatable = false)
    private String consentVersion;

    @Column(name = "granted_at", nullable = false, updatable = false)
    private Instant grantedAt;

    /** Thời điểm khách rút lại đồng ý; null nghĩa là còn hiệu lực. */
    @Column(name = "revoked_at")
    private Instant revokedAt;

    /** Chỉ OnboardingRules gọi, khi khách gửi hồ sơ. */
    public BiometricConsent(UUID id) {
        super(id);
    }
}
