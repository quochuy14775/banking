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

import java.time.LocalDate;
import java.util.UUID;

/**
 * Khách hàng (CIF): chỉ chứa dữ liệu, ánh xạ với bảng {@code customer}. Chỉ được tạo khi nhân viên duyệt một hồ sơ đăng ký
 * ({@link OnboardingApplication}); mỗi số CCCD có tối đa một khách. Mật khẩu và đăng nhập thuộc auth-service.
 *
 * <p>Hàm nghiệp vụ nằm ở {@code CustomerRules}. Lombok: không dùng {@code @Data}, {@code @Builder}...
 */
@Entity
@Table(name = "customer")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public class Customer extends BaseEntity {

    /** Số CIF do ngân hàng cấp, hiển thị cho khách và nhân viên. */
    @Column(name = "cif_number", nullable = false, updatable = false, unique = true)
    private String cifNumber;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(name = "date_of_birth", nullable = false)
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", nullable = false)
    private Gender gender;

    /** Số CCCD 12 chữ số, không cho trùng giữa các khách hàng. Cần mã hóa/băm khi lưu (chưa làm). */
    @Column(name = "national_id", nullable = false, updatable = false, unique = true)
    private String nationalId;

    /** Số CMND 9 số cũ (nếu có). */
    @Column(name = "old_id_number")
    private String oldIdNumber;

    @Column(name = "address", nullable = false)
    private String address;

    @Column(name = "id_issue_date")
    private LocalDate idIssueDate;

    /** Chỉ là thông tin liên hệ, KHÔNG dùng để xác thực. */
    @Column(name = "phone")
    private String phone;

    @Column(name = "email")
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private CustomerStatus status;

    /** Chỉ CustomerRules gọi, khi nhân viên duyệt hồ sơ đăng ký. */
    public Customer(UUID id) {
        super(id);
    }
}
