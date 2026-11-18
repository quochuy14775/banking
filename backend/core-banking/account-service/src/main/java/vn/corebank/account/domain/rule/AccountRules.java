package vn.corebank.account.domain.rule;

import vn.corebank.account.domain.exception.AccountStateException;
import vn.corebank.account.domain.model.Account;
import vn.corebank.account.domain.model.AccountStatus;
import vn.corebank.common.support.Validation;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Hàm nghiệp vụ của tài khoản: mở, phong tỏa, gỡ phong tỏa, đóng.
 * Mọi thay đổi trạng thái tài khoản đều phải đi qua đây để quy tắc luôn được kiểm tra.
 * Chỉ dùng dữ liệu của chính tài khoản; việc cần database hay service khác thì tầng application làm.
 */
public final class AccountRules {

    private static final Pattern ACCOUNT_NUMBER = Pattern.compile("\\d{12}");
    private static final Pattern CURRENCY = Pattern.compile("[A-Z]{3}");

    private AccountRules() {
    }

    /** Mở tài khoản mới, ở trạng thái {@link AccountStatus#ACTIVE}. */
    public static Account open(String accountNumber, String ownerId, String productCode, String currency,
                               Instant openedAt) {
        Account account = new Account(UUID.randomUUID());
        account.setAccountNumber(Validation.requireMatch(accountNumber, ACCOUNT_NUMBER, "accountNumber"));
        account.setOwnerId(Validation.requireText(ownerId, "ownerId"));
        account.setProductCode(Validation.requireText(productCode, "productCode"));
        account.setCurrency(Validation.requireMatch(currency, CURRENCY, "currency"));
        account.setOpenedAt(Objects.requireNonNull(openedAt, "openedAt"));
        account.setStatus(AccountStatus.ACTIVE);
        return account;
    }

    /** Phong tỏa tài khoản đang hoạt động. */
    public static void freeze(Account account) {
        requireStatus(account, AccountStatus.ACTIVE, "Chỉ phong tỏa được tài khoản đang hoạt động.");
        account.setStatus(AccountStatus.FROZEN);
    }

    /** Gỡ phong tỏa, đưa tài khoản về trạng thái hoạt động. */
    public static void unfreeze(Account account) {
        requireStatus(account, AccountStatus.FROZEN, "Tài khoản không ở trạng thái phong tỏa.");
        account.setStatus(AccountStatus.ACTIVE);
    }

    /**
     * Đóng tài khoản. Tài khoản đang phong tỏa phải được gỡ phong tỏa trước.
     * Điều kiện số dư bằng 0 do tầng application kiểm tra với ledger-service.
     */
    public static void close(Account account, Instant closedAt) {
        requireStatus(account, AccountStatus.ACTIVE, "Chỉ đóng được tài khoản đang hoạt động.");
        account.setClosedAt(Objects.requireNonNull(closedAt, "closedAt"));
        account.setStatus(AccountStatus.CLOSED);
    }

    public static boolean isActive(Account account) {
        return account.getStatus() == AccountStatus.ACTIVE;
    }

    public static boolean isOwnedBy(Account account, String userId) {
        return account.getOwnerId().equals(userId);
    }

    private static void requireStatus(Account account, AccountStatus expected, String message) {
        if (account.getStatus() != expected) {
            throw new AccountStateException(message);
        }
    }
}
