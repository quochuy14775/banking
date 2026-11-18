package vn.corebank.auth.web.dto;

import vn.corebank.auth.application.AuthTokens;

/**
 * Cặp token trả về cho app.
 *
 * @param tokenType        luôn là {@code Bearer}: app gửi kèm header {@code Authorization: Bearer <accessToken>}
 * @param expiresIn        số giây còn lại của access token
 * @param refreshExpiresIn số giây còn lại của refresh token
 */
public record TokenResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        String refreshToken,
        long refreshExpiresIn) {

    public static TokenResponse from(AuthTokens tokens) {
        return new TokenResponse(
                tokens.accessToken(),
                "Bearer",
                tokens.accessTokenExpiresIn(),
                tokens.refreshToken(),
                tokens.refreshTokenExpiresIn());
    }
}
