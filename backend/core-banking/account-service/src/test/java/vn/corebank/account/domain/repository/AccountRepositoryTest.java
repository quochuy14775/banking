package vn.corebank.account.domain.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Testcontainers;
import vn.corebank.account.TestcontainersConfiguration;
import vn.corebank.account.domain.model.Account;
import vn.corebank.account.domain.model.AccountStatus;
import vn.corebank.account.domain.rule.AccountRules;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

// Chạy với PostgreSQL thật (Testcontainers) và migration Flyway thật, nên kiểm tra được cả ánh xạ entity ↔ bảng.
// Máy chưa có Docker thì JUnit bỏ qua test này.
@Testcontainers(disabledWithoutDocker = true)
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class AccountRepositoryTest {

    private static final Instant NOW = Instant.parse("2026-11-16T09:00:00Z");

    @Autowired
    private AccountRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void findsOnlyAccountsOfOwner() {
        Account first = AccountRules.open("190300000001", "user-a", "CASA_VND", "VND", NOW);
        Account second = AccountRules.open("190300000002", "user-a", "SAVING_VND", "VND", NOW.plusSeconds(60));
        Account ofOtherUser = AccountRules.open("190300000003", "user-b", "CASA_VND", "VND", NOW);
        repository.saveAll(List.of(second, first, ofOtherUser));
        entityManager.flush();
        entityManager.clear();

        assertThat(repository.findByOwnerIdOrderByOpenedAtAsc("user-a"))
                .extracting(Account::getAccountNumber)
                .containsExactly("190300000001", "190300000002");
        assertThat(repository.findByIdAndOwnerId(ofOtherUser.getId(), "user-a")).isEmpty();
        assertThat(repository.findByIdAndOwnerId(ofOtherUser.getId(), "user-b")).isPresent();
        assertThat(repository.existsByAccountNumber("190300000003")).isTrue();
        assertThat(repository.existsByAccountNumber("190399999999")).isFalse();
    }

    @Test
    void persistsStatusChangeAndIncreasesVersion() {
        Account account = repository.saveAndFlush(AccountRules.open("190300000004", "user-a", "CASA_VND", "VND", NOW));
        assertThat(account.getVersion()).isZero();
        assertThat(account.getCreatedAt()).isNotNull();

        AccountRules.freeze(account);
        repository.saveAndFlush(account);
        entityManager.clear();

        Account reloaded = repository.findById(account.getId()).orElseThrow();
        assertThat(reloaded.getStatus()).isEqualTo(AccountStatus.FROZEN);
        assertThat(reloaded.getVersion()).isEqualTo(1L);
    }
}
