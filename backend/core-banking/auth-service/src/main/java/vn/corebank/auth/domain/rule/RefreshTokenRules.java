package vn.corebank.auth.domain.rule;

import vn.corebank.auth.domain.model.RefreshToken;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Hàm nghiệp vụ của refresh token: cấp, kiểm tra hết hạn, thu hồi, xoay vòng.
 * Mỗi token chỉ dùng được MỘT lần: khi làm mới, token cũ bị thu hồi và trỏ sang token mới.
 */
public final class RefreshTokenRules {

    private RefreshTokenRules() {
    }

    /** Cấp token mới. {@code tokenHash} là bản băm SHA-256 của token gốc, không phải token gốc. */
    public static RefreshToken issue(UUID userId, UUID familyId, String tokenHash, Instant now, Duration ttl) {
        RefreshToken token = new RefreshToken(UUID.randomUUID());
        token.setUserId(Objects.requireNonNull(userId, "userId"));
        token.setFamilyId(Objects.requireNonNull(familyId, "familyId"));
        token.setTokenHash(Objects.requireNonNull(tokenHash, "tokenHash"));
        token.setExpiresAt(now.plus(ttl));
        return token;
    }

    public static boolean isRevoked(RefreshToken token) {
        return token.getRevokedAt() != null;
    }

    public static boolean isExpired(RefreshToken token, Instant now) {
        return !now.isBefore(token.getExpiresAt());
    }

    /** Thu hồi token. Gọi lại lần nữa không đổi thời điểm thu hồi ban đầu. */
    public static void revoke(RefreshToken token, Instant now) {
        if (token.getRevokedAt() == null) {
            token.setRevokedAt(now);
        }
    }

    /** Token đã được dùng để làm mới: thu hồi và ghi lại token thay thế. */
    public static void replaceWith(RefreshToken token, UUID nextTokenId, Instant now) {
        revoke(token, now);
        token.setReplacedById(Objects.requireNonNull(nextTokenId, "nextTokenId"));
    }
}
