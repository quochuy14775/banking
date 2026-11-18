package vn.corebank.account.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.account.domain.exception.AccountNotFoundException;
import vn.corebank.account.domain.model.Account;
import vn.corebank.account.domain.repository.AccountRepository;

import java.util.List;
import java.util.UUID;

/** Tra cứu tài khoản. Chỉ đọc, nên dùng transaction readOnly để database tối ưu. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AccountQueryService {

    private final AccountRepository accountRepository;

    /** Tài khoản của một người dùng, tài khoản mở trước đứng trước. */
    public List<Account> accountsOf(String ownerId) {
        return accountRepository.findByOwnerIdOrderByOpenedAtAsc(ownerId);
    }

    /** Một tài khoản của người dùng. Tài khoản không tồn tại hoặc của người khác đều báo không tìm thấy. */
    public Account accountOf(UUID accountId, String ownerId) {
        return accountRepository.findByIdAndOwnerId(accountId, ownerId)
                .orElseThrow(AccountNotFoundException::new);
    }
}
