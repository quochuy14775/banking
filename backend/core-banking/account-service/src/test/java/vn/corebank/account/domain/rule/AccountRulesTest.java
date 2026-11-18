package vn.corebank.account.domain.rule;

import org.junit.jupiter.api.Test;
import vn.corebank.account.domain.exception.AccountStateException;
import vn.corebank.account.domain.model.Account;
import vn.corebank.account.domain.model.AccountStatus;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

// Test thuần Java cho quy tắc nghiệp vụ: không cần database hay Docker nên chạy rất nhanh.
class AccountRulesTest {

    private static final Instant NOW = Instant.parse("2026-11-16T09:00:00Z");

    private static Account newAccount() {
        return AccountRules.open("190300000001", "user-a", "CASA_VND", "VND", NOW);
    }

    @Test
    void openCreatesActiveAccount() {
        Account account = newAccount();

        assertThat(account.getId()).isNotNull();
        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
        assertThat(AccountRules.isActive(account)).isTrue();
        assertThat(account.getOpenedAt()).isEqualTo(NOW);
        assertThat(account.getClosedAt()).isNull();
    }

    @Test
    void openRejectsInvalidAccountNumber() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> AccountRules.open("1903-0001", "user-a", "CASA_VND", "VND", NOW));
    }

    @Test
    void openRejectsInvalidCurrency() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> AccountRules.open("190300000001", "user-a", "CASA_VND", "vnd", NOW));
    }

    @Test
    void openRejectsBlankOwner() {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> AccountRules.open("190300000001", " ", "CASA_VND", "VND", NOW));
    }

    @Test
    void freezeThenUnfreeze() {
        Account account = newAccount();

        AccountRules.freeze(account);
        assertThat(account.getStatus()).isEqualTo(AccountStatus.FROZEN);
        assertThat(AccountRules.isActive(account)).isFalse();

        AccountRules.unfreeze(account);
        assertThat(account.getStatus()).isEqualTo(AccountStatus.ACTIVE);
    }

    @Test
    void cannotFreezeTwice() {
        Account account = newAccount();
        AccountRules.freeze(account);

        assertThatThrownBy(() -> AccountRules.freeze(account))
                .isInstanceOf(AccountStateException.class)
                .hasFieldOrPropertyWithValue("code", AccountStateException.CODE);
    }

    @Test
    void cannotUnfreezeActiveAccount() {
        assertThatThrownBy(() -> AccountRules.unfreeze(newAccount())).isInstanceOf(AccountStateException.class);
    }

    @Test
    void cannotCloseFrozenAccount() {
        Account account = newAccount();
        AccountRules.freeze(account);

        assertThatThrownBy(() -> AccountRules.close(account, NOW)).isInstanceOf(AccountStateException.class);
        assertThat(account.getStatus()).isEqualTo(AccountStatus.FROZEN);
    }

    @Test
    void closedAccountIsFinal() {
        Account account = newAccount();
        Instant closedAt = NOW.plusSeconds(3600);

        AccountRules.close(account, closedAt);

        assertThat(account.getStatus()).isEqualTo(AccountStatus.CLOSED);
        assertThat(account.getClosedAt()).isEqualTo(closedAt);
        assertThatThrownBy(() -> AccountRules.freeze(account)).isInstanceOf(AccountStateException.class);
        assertThatThrownBy(() -> AccountRules.unfreeze(account)).isInstanceOf(AccountStateException.class);
        assertThatThrownBy(() -> AccountRules.close(account, closedAt)).isInstanceOf(AccountStateException.class);
    }

    @Test
    void ownership() {
        Account account = newAccount();

        assertThat(AccountRules.isOwnedBy(account, "user-a")).isTrue();
        assertThat(AccountRules.isOwnedBy(account, "user-b")).isFalse();
    }

    @Test
    void accountsAreEqualById() {
        Account account = newAccount();
        Account other = newAccount();

        assertThat(account).isEqualTo(account).isNotEqualTo(other);
    }
}
