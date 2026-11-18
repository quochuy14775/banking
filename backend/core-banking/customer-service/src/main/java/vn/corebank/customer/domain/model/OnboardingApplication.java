package vn.corebank.customer.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.corebank.common.domain.BaseEntity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Hồ sơ đăng ký mở tài khoản, ánh xạ với bảng {@code onboarding_application}. Khách gửi thông tin CCCD và ảnh, nhân viên
 * duyệt (tạo {@link Customer}) hoặc từ chối. Hồ sơ chờ duyệt không giữ số CCCD: người khác gửi trước cũng không chặn được
 * chủ thật của CCCD, vì chỉ hồ sơ được duyệt mới thành khách hàng.
 *
 * <p>Thời điểm gửi chính là {@code createdAt}. Hàm nghiệp vụ nằm ở {@code OnboardingRules}.
 */
@Entity
@Table(name = "onboarding_application")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public class OnboardingApplication extends BaseEntity {

    @Column(name = "national_id", nullable = false, updatable = false)
    private String nationalId;

    @Column(name = "old_id_number", updatable = false)
    private String oldIdNumber;

    @Column(name = "full_name", nullable = false, updatable = false)
    private String fullName;

    @Column(name = "date_of_birth", nullable = false, updatable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false, updatable = false)
    private Gender gender;

    @Column(name = "address", nullable = false, updatable = false)
    private String address;

    @Column(name = "id_issue_date", updatable = false)
    private LocalDate idIssueDate;

    @Column(name = "phone", updatable = false)
    private String phone;

    @Column(name = "email", updatable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ApplicationStatus status;

    /** Bản băm SHA-256 (hex) của mã tra cứu; mã gốc chỉ trả cho khách một lần lúc gửi hồ sơ. */
    @Column(name = "access_code_hash", nullable = false, updatable = false)
    private String accessCodeHash;

    /** Chỉ có khi {@code status} là REJECTED. */
    @Column(name = "reject_reason")
    private String rejectReason;

    /** Mã nhân viên (claim {@code sub} trong token) đã duyệt hoặc từ chối. */
    @Column(name = "reviewed_by")
    private UUID reviewedBy;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    /** Khách hàng được tạo khi duyệt; chỉ có khi {@code status} là APPROVED. */
    @Column(name = "customer_id")
    private UUID customerId;

    /** Chỉ OnboardingRules gọi, khi khách gửi hồ sơ. */
    public OnboardingApplication(UUID id) {
        super(id);
    }
}
