package vn.corebank.auth.domain.model;

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
import java.util.UUID;

/**
 * Tài khoản đăng nhập: chỉ chứa dữ liệu, ánh xạ với bảng {@code user_account}.
 * Không chứa họ tên, CCCD, eKYC: các thông tin đó thuộc customer-service.
 *
 * <p>Hàm nghiệp vụ (đăng ký, khóa khi sai mật khẩu...) nằm ở {@code UserAccountRules}. Setter và constructor là public
 * để UserAccountRules dùng được, nhưng ArchitectureTest sẽ báo lỗi nếu code ở chỗ khác gọi tới chúng.
 *
 * <p>Id, version, created_at, updated_at nằm ở {@link BaseEntity} (module common).
 * Lombok: không dùng {@code @Data}, {@code @EqualsAndHashCode}, {@code @ToString}, {@code @Builder}.
 */
@Entity
@Table(name = "user_account")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public class UserAccount extends BaseEntity {

    @Column(name = "username", nullable = false, updatable = false, unique = true)
    private String username;

    /** Mật khẩu đã băm, có tiền tố thuật toán, ví dụ {@code {bcrypt}$2a$10$...}. */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false)
    private UserRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private UserStatus status;

    /** Số lần nhập sai mật khẩu liên tiếp, về 0 khi đăng nhập đúng hoặc khi bị khóa. */
    @Column(name = "failed_login_attempts", nullable = false)
    private int failedLoginAttempts;

    /** Khóa đăng nhập tới thời điểm này; null là không bị khóa. */
    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login_at")
    private Instant lastLoginAt;

    /**
     * Khách hàng (CIF) ở customer-service mà tài khoản này thuộc về; chỉ tài khoản CUSTOMER có, nhân viên thì null.
     * Ghi vào claim {@code customer_id} của access token để các service khác biết khách nào đang gọi.
     */
    @Column(name = "customer_id", updatable = false, unique = true)
    private UUID customerId;

    /** Chỉ UserAccountRules gọi, khi đăng ký tài khoản mới. */
    public UserAccount(UUID id) {
        super(id);
    }
}
