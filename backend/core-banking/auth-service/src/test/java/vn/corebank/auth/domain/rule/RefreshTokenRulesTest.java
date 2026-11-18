package vn.corebank.auth.domain.rule;

import org.junit.jupiter.api.Test;
import vn.corebank.auth.domain.model.RefreshToken;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RefreshTokenRulesTest {

    private static final Instant NOW = Instant.parse("2026-11-17T09:00:00Z");
    private static final Duration TTL = Duration.ofDays(7);

    private static RefreshToken newToken() {
        return RefreshTokenRules.issue(UUID.randomUUID(), UUID.randomUUID(), "hash", NOW, TTL);
    }

    @Test
    void expiresAfterTtl() {
        RefreshToken token = newToken();

        assertThat(token.getExpiresAt()).isEqualTo(NOW.plus(TTL));
        assertThat(RefreshTokenRules.isExpired(token, NOW.plus(TTL).minusSeconds(1))).isFalse();
        assertThat(RefreshTokenRules.isExpired(token, NOW.plus(TTL))).isTrue();
    }

    @Test
    void replaceRevokesAndPointsToNextToken() {
        RefreshToken token = newToken();
        UUID next = UUID.randomUUID();

        RefreshTokenRules.replaceWith(token, next, NOW);

        assertThat(RefreshTokenRules.isRevoked(token)).isTrue();
        assertThat(token.getRevokedAt()).isEqualTo(NOW);
        assertThat(token.getReplacedById()).isEqualTo(next);
    }

    @Test
    void revokeKeepsFirstRevocationTime() {
        RefreshToken token = newToken();

        RefreshTokenRules.revoke(token, NOW);
        RefreshTokenRules.revoke(token, NOW.plusSeconds(60));

        assertThat(token.getRevokedAt()).isEqualTo(NOW);
    }
}
