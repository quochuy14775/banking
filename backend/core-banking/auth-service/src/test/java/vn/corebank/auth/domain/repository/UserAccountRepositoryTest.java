package vn.corebank.auth.domain.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.corebank.auth.TestcontainersConfiguration;
import vn.corebank.auth.domain.model.RefreshToken;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.rule.RefreshTokenRules;
import vn.corebank.auth.domain.rule.UserAccountRules;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

// Chạy với PostgreSQL thật (Testcontainers) và migration Flyway thật, nên kiểm tra được cả ánh xạ entity ↔ bảng.
// Máy chưa có Docker thì JUnit bỏ qua test này.
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class UserAccountRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-11-17T09:00:00Z");

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private RefreshTokenRepository refreshTokenRepository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findsUserByNormalizedUsername() {
        userAccountRepository.save(UserAccountRules.registerCustomer("An.Nguyen", "{bcrypt}hash", UUID.randomUUID()));
        entityManager.flush();
        entityManager.clear();

        assertThat(userAccountRepository.findByUsername("an.nguyen")).isPresent();
        assertThat(userAccountRepository.existsByUsername("an.nguyen")).isTrue();
        assertThat(userAccountRepository.existsByUsername("khong.ton.tai")).isFalse();
    }

    @Test
    void findsActiveTokensOfSession() {
        UserAccount user = userAccountRepository.save(
                UserAccountRules.registerCustomer("binh.tran", "{bcrypt}hash", UUID.randomUUID()));
        UUID familyId = UUID.randomUUID();
        RefreshToken used = RefreshTokenRules.issue(user.getId(), familyId, "hash-1", NOW, Duration.ofDays(7));
        RefreshToken active = RefreshTokenRules.issue(user.getId(), familyId, "hash-2", NOW, Duration.ofDays(7));
        RefreshTokenRules.replaceWith(used, active.getId(), NOW);
        refreshTokenRepository.save(used);
        refreshTokenRepository.save(active);
        entityManager.flush();
        entityManager.clear();

        assertThat(refreshTokenRepository.findByTokenHash("hash-1")).isPresent();
        assertThat(refreshTokenRepository.findByFamilyIdAndRevokedAtIsNull(familyId))
                .extracting(RefreshToken::getTokenHash)
                .containsExactly("hash-2");
    }
}
