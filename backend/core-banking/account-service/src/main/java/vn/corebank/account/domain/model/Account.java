package vn.corebank.account.domain.model;

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
 * Tài khoản ngân hàng: chỉ chứa dữ liệu, ánh xạ với bảng {@code account}.
 * Số dư KHÔNG nằm ở đây mà do ledger-service quản lý.
 *
 * <p>Hàm nghiệp vụ (mở, phong tỏa, đóng...) nằm ở {@code AccountRules}. Setter và constructor là public để
 * AccountRules dùng được, nhưng ArchitectureTest sẽ báo lỗi nếu code ở chỗ khác gọi tới chúng.
 *
 * <p>Id, version, created_at, updated_at nằm ở {@link BaseEntity} (module common).
 * Lombok: không dùng {@code @Data}, {@code @EqualsAndHashCode}, {@code @ToString}, {@code @Builder}.
 */
@Entity
@Table(name = "account")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public class Account extends BaseEntity {

    @Column(name = "account_number", nullable = false, updatable = false, unique = true)
    private String accountNumber;

    /** Mã người dùng của auth-service (claim {@code sub} trong token). Khi có customer-service sẽ đổi sang mã khách hàng (CIF). */
    @Column(name = "owner_id", nullable = false, updatable = false)
    private String ownerId;

    /** Loại sản phẩm, ví dụ {@code CASA_VND} là tài khoản thanh toán VND. */
    @Column(name = "product_code", nullable = false, updatable = false)
    private String productCode;

    /** Mã tiền tệ ISO 4217, ví dụ {@code VND}. */
    @Column(name = "currency", nullable = false, updatable = false)
    private String currency;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AccountStatus status;

    @Column(name = "opened_at", nullable = false, updatable = false)
    private Instant openedAt;

    @Column(name = "closed_at")
    private Instant closedAt;

    /** Chỉ AccountRules gọi, khi mở tài khoản mới. */
    public Account(UUID id) {
        super(id);
    }
}
