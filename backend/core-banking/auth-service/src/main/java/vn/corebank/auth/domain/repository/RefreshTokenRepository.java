package vn.corebank.auth.domain.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.corebank.auth.domain.model.RefreshToken;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Truy cập bảng {@code refresh_token}. */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /** Các token còn hiệu lực của một phiên, dùng khi thu hồi cả phiên. */
    List<RefreshToken> findByFamilyIdAndRevokedAtIsNull(UUID familyId);
}
