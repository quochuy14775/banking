package vn.corebank.auth.application;

import org.junit.jupiter.api.Test;
import vn.corebank.auth.domain.exception.InvalidRefreshTokenException;
import vn.corebank.auth.domain.model.RefreshToken;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.repository.RefreshTokenRepository;
import vn.corebank.auth.domain.repository.UserAccountRepository;
import vn.corebank.auth.domain.rule.RefreshTokenRules;
import vn.corebank.auth.domain.rule.UserAccountRules;
import vn.corebank.auth.domain.support.TokenSecrets;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class SessionServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-17T09:00:00Z");
    private static final Duration TTL = Duration.ofDays(7);

    private final RefreshTokenRepository refreshTokenRepository = mock(RefreshTokenRepository.class);
    private final UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
    private final TokenPairIssuer tokenPairIssuer = mock(TokenPairIssuer.class);
    private final SessionService sessionService = new SessionService(refreshTokenRepository, userAccountRepository,
            tokenPairIssuer, Clock.fixed(NOW, ZoneOffset.UTC));

    private final UserAccount user = UserAccountRules.registerCustomer("an.nguyen", "{bcrypt}hash", UUID.randomUUID());
    private final UUID familyId = UUID.randomUUID();

    private RefreshToken tokenIssuedAt(String raw, Instant issuedAt) {
        RefreshToken token = RefreshTokenRules.issue(user.getId(), familyId, TokenSecrets.sha256(raw), issuedAt, TTL);
        given(refreshTokenRepository.findByTokenHash(TokenSecrets.sha256(raw))).willReturn(Optional.of(token));
        return token;
    }

    @Test
    void refreshRotatesToken() {
        RefreshToken current = tokenIssuedAt("raw-old", NOW.minusSeconds(60));
        UUID nextId = UUID.randomUUID();
        AuthTokens next = new AuthTokens("access", NOW.plusSeconds(900), "raw-new", NOW.plus(TTL), nextId, NOW);
        given(userAccountRepository.findById(user.getId())).willReturn(Optional.of(user));
        given(tokenPairIssuer.issue(user, familyId, NOW)).willReturn(next);

        assertThat(sessionService.refresh("raw-old")).isSameAs(next);

        // Token cũ bị thu hồi và trỏ sang token mới.
        assertThat(RefreshTokenRules.isRevoked(current)).isTrue();
        assertThat(current.getReplacedById()).isEqualTo(nextId);
    }

    @Test
    void reusingUsedTokenRevokesWholeSession() {
        RefreshToken used = tokenIssuedAt("raw-used", NOW.minusSeconds(120));
        RefreshTokenRules.replaceWith(used, UUID.randomUUID(), NOW.minusSeconds(60));
        RefreshToken stillActive = RefreshTokenRules.issue(user.getId(), familyId, "hash-active", NOW.minusSeconds(60), TTL);
        given(refreshTokenRepository.findByFamilyIdAndRevokedAtIsNull(familyId)).willReturn(List.of(stillActive));

        assertThatThrownBy(() -> sessionService.refresh("raw-used"))
                .isInstanceOf(InvalidRefreshTokenException.class);

        assertThat(RefreshTokenRules.isRevoked(stillActive)).isTrue();
        verifyNoInteractions(tokenPairIssuer);
    }

    @Test
    void expiredTokenIsRejected() {
        tokenIssuedAt("raw-expired", NOW.minus(TTL).minusSeconds(1));

        assertThatThrownBy(() -> sessionService.refresh("raw-expired"))
                .isInstanceOf(InvalidRefreshTokenException.class);
        verifyNoInteractions(tokenPairIssuer);
    }

    @Test
    void unknownTokenIsRejected() {
        given(refreshTokenRepository.findByTokenHash(TokenSecrets.sha256("raw-unknown"))).willReturn(Optional.empty());

        assertThatThrownBy(() -> sessionService.refresh("raw-unknown"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void logoutRevokesSession() {
        RefreshToken current = tokenIssuedAt("raw-current", NOW.minusSeconds(60));
        given(refreshTokenRepository.findByFamilyIdAndRevokedAtIsNull(familyId)).willReturn(List.of(current));

        sessionService.logout("raw-current");

        assertThat(RefreshTokenRules.isRevoked(current)).isTrue();
    }

    @Test
    void logoutWithUnknownTokenDoesNothing() {
        given(refreshTokenRepository.findByTokenHash(TokenSecrets.sha256("raw-unknown"))).willReturn(Optional.empty());

        assertThatNoException().isThrownBy(() -> sessionService.logout("raw-unknown"));
    }
}
