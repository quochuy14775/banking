package vn.corebank.auth.application;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Cặp token cấp cho app sau khi đăng nhập hoặc làm mới.
 *
 * @param refreshTokenId id của refresh token trong database, chỉ dùng nội bộ (không trả cho app)
 */
public record AuthTokens(
        String accessToken,
        Instant accessTokenExpiresAt,
        String refreshToken,
        Instant refreshTokenExpiresAt,
        UUID refreshTokenId,
        Instant issuedAt) {

    /** Số giây còn lại của access token, tính từ lúc cấp. */
    public long accessTokenExpiresIn() {
        return Duration.between(issuedAt, accessTokenExpiresAt).toSeconds();
    }

    /** Số giây còn lại của refresh token, tính từ lúc cấp. */
    public long refreshTokenExpiresIn() {
        return Duration.between(issuedAt, refreshTokenExpiresAt).toSeconds();
    }
}
