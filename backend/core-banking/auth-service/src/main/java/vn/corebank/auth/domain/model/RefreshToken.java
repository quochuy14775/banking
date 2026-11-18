package vn.corebank.auth.domain.model;

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
 * Refresh token: chỉ chứa dữ liệu, ánh xạ với bảng {@code refresh_token}.
 * Chỉ lưu bản băm SHA-256, không lưu token gốc. Các token xoay vòng trong cùng một lần đăng nhập dùng chung {@code familyId}.
 *
 * <p>Hàm nghiệp vụ (cấp, thu hồi, xoay vòng) nằm ở {@code RefreshTokenRules}; ArchitectureTest bảo đảm
 * chỉ class đó được tạo token và gọi setter.
 */
@Entity
@Table(name = "refresh_token")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public class RefreshToken extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    /** Mã của phiên đăng nhập; mọi token sinh ra từ một lần đăng nhập dùng chung mã này. */
    @Column(name = "family_id", nullable = false, updatable = false)
    private UUID familyId;

    @Column(name = "token_hash", nullable = false, updatable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false, updatable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    /** Token mới thay thế token này khi làm mới; null nếu bị thu hồi vì lý do khác (đăng xuất...). */
    @Column(name = "replaced_by_id")
    private UUID replacedById;

    /** Chỉ RefreshTokenRules gọi, khi cấp token mới. */
    public RefreshToken(UUID id) {
        super(id);
    }
}
