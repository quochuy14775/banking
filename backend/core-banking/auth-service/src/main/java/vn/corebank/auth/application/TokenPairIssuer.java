package vn.corebank.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import vn.corebank.auth.config.AuthProperties;
import vn.corebank.auth.domain.model.AccessToken;
import vn.corebank.auth.domain.model.RefreshToken;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.port.AccessTokenIssuer;
import vn.corebank.auth.domain.repository.RefreshTokenRepository;
import vn.corebank.auth.domain.rule.RefreshTokenRules;
import vn.corebank.auth.domain.support.TokenSecrets;

import java.time.Instant;
import java.util.UUID;

/**
 * Cấp một cặp access token + refresh token trong một phiên đăng nhập.
 * Dùng chung cho đăng nhập (phiên mới) và làm mới token (cùng phiên). Phải chạy trong transaction của nơi gọi.
 */
@Component
@RequiredArgsConstructor
class TokenPairIssuer {

    private final RefreshTokenRepository refreshTokenRepository;
    private final AccessTokenIssuer accessTokenIssuer;
    private final AuthProperties properties;

    AuthTokens issue(UserAccount user, UUID familyId, Instant now) {
        String rawRefreshToken = TokenSecrets.generate();
        RefreshToken refreshToken = refreshTokenRepository.save(RefreshTokenRules.issue(
                user.getId(), familyId, TokenSecrets.sha256(rawRefreshToken), now, properties.refreshTokenTtl()));
        AccessToken accessToken = accessTokenIssuer.issue(user, now);
        return new AuthTokens(accessToken.value(), accessToken.expiresAt(),
                rawRefreshToken, refreshToken.getExpiresAt(), refreshToken.getId(), now);
    }
}
