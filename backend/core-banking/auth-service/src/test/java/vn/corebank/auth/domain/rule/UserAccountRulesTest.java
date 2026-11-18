package vn.corebank.auth.domain.rule;

import org.junit.jupiter.api.Test;
import vn.corebank.auth.domain.exception.UserDisabledException;
import vn.corebank.auth.domain.exception.UserLockedException;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.model.UserStatus;

import java.util.UUID;
import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Test thuần Java cho quy tắc nghiệp vụ: không cần database hay Docker nên chạy rất nhanh.
class UserAccountRulesTest {

    private static final Instant NOW = Instant.parse("2026-11-17T09:00:00Z");
    private static final int MAX_ATTEMPTS = 5;
    private static final Duration LOCK = Duration.ofMinutes(15);

    private static UserAccount newUser() {
        return UserAccountRules.registerCustomer("an.nguyen", "{bcrypt}hash", UUID.randomUUID());
    }

    @Test
    void registerNormalizesUsername() {
        UserAccount user = UserAccountRules.registerCustomer("  An.Nguyen ", "{bcrypt}hash", UUID.randomUUID());

        assertThat(user.getId()).isNotNull();
        assertThat(user.getUsername()).isEqualTo("an.nguyen");
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getFailedLoginAttempts()).isZero();
    }

    @Test
    void registerRejectsInvalidUsername() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> UserAccountRules.registerCustomer("an nguyen", "{bcrypt}hash", UUID.randomUUID()));
        assertThatIllegalArgumentException()
                .isThrownBy(() -> UserAccountRules.registerCustomer("abc", "{bcrypt}hash", UUID.randomUUID()));
    }

    @Test
    void locksAfterTooManyFailedLogins() {
        UserAccount user = newUser();

        for (int i = 1; i < MAX_ATTEMPTS; i++) {
            assertThat(UserAccountRules.recordFailedLogin(user, NOW, MAX_ATTEMPTS, LOCK)).isFalse();
        }
        assertThat(UserAccountRules.recordFailedLogin(user, NOW, MAX_ATTEMPTS, LOCK)).isTrue();

        assertThat(UserAccountRules.isLocked(user, NOW)).isTrue();
        assertThat(user.getLockedUntil()).isEqualTo(NOW.plus(LOCK));
        assertThatThrownBy(() -> UserAccountRules.ensureCanLogIn(user, NOW.plusSeconds(60)))
                .isInstanceOf(UserLockedException.class)
                .hasFieldOrPropertyWithValue("code", UserLockedException.CODE);
    }

    @Test
    void lockExpiresByItself() {
        UserAccount user = newUser();
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            UserAccountRules.recordFailedLogin(user, NOW, MAX_ATTEMPTS, LOCK);
        }

        Instant afterLock = NOW.plus(LOCK);
        assertThat(UserAccountRules.isLocked(user, afterLock)).isFalse();
        assertThatNoException().isThrownBy(() -> UserAccountRules.ensureCanLogIn(user, afterLock));
    }

    @Test
    void successfulLoginResetsFailures() {
        UserAccount user = newUser();
        UserAccountRules.recordFailedLogin(user, NOW, MAX_ATTEMPTS, LOCK);
        UserAccountRules.recordFailedLogin(user, NOW, MAX_ATTEMPTS, LOCK);

        UserAccountRules.recordSuccessfulLogin(user, NOW);

        assertThat(user.getFailedLoginAttempts()).isZero();
        assertThat(user.getLockedUntil()).isNull();
        assertThat(user.getLastLoginAt()).isEqualTo(NOW);
    }

    @Test
    void disabledUserCannotLogIn() {
        UserAccount user = newUser();
        UserAccountRules.disable(user);

        assertThatThrownBy(() -> UserAccountRules.ensureCanLogIn(user, NOW)).isInstanceOf(UserDisabledException.class);
    }
}
