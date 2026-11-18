package vn.corebank.account.web.dto;

import vn.corebank.account.domain.model.Account;

import java.time.Instant;
import java.util.UUID;

/**
 * Tài khoản trả về cho app. Tách khỏi entity để đổi cấu trúc bảng không làm vỡ API.
 * Chưa có số dư: số dư thuộc ledger-service.
 */
public record AccountResponse(
        UUID id,
        String accountNumber,
        String productCode,
        String currency,
        String status,
        Instant openedAt) {

    public static AccountResponse from(Account account) {
        return new AccountResponse(
                account.getId(),
                account.getAccountNumber(),
                account.getProductCode(),
                account.getCurrency(),
                account.getStatus().name(),
                account.getOpenedAt());
    }
}
