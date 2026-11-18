package vn.corebank.account.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.account.domain.model.Account;
import vn.corebank.account.domain.port.AccountNumberGenerator;
import vn.corebank.account.domain.repository.AccountRepository;
import vn.corebank.account.domain.rule.AccountRules;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Mở tài khoản: điều phối các bước, còn quy tắc của tài khoản nằm trong {@link AccountRules#open}.
 * Sau này thêm bước phát sự kiện "tài khoản đã mở" để ledger-service tạo tài khoản sổ cái.
 */
@Service
@RequiredArgsConstructor
public class AccountOpeningService {

    /** Bản đầu tiên chỉ có tài khoản VND. */
    private static final String CURRENCY = "VND";

    private final AccountRepository accountRepository;
    private final AccountNumberGenerator accountNumberGenerator;
    private final Clock clock;

    @Transactional
    public Account open(String ownerId, String productCode) {
        // Cắt về micro giây vì PostgreSQL chỉ lưu tới đó; nếu không, giá trị trả về lúc mở khác với lúc đọc lại.
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        Account account = AccountRules.open(accountNumberGenerator.next(), ownerId, productCode, CURRENCY, now);
        return accountRepository.save(account);
    }
}
