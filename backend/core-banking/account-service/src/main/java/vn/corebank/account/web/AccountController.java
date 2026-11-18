package vn.corebank.account.web;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.corebank.account.application.AccountQueryService;
import vn.corebank.account.web.dto.AccountResponse;

import java.util.List;
import java.util.UUID;

/**
 * API cho app: người dùng xem tài khoản của chính mình.
 * Controller chỉ nhận request, gọi tầng application và đổi kết quả sang DTO; không chứa quy tắc nghiệp vụ.
 */
@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
class AccountController {

    private final AccountQueryService accountQueryService;
    private final CurrentUser currentUser;

    /** GET /api/accounts: danh sách tài khoản của người đang gọi. */
    @GetMapping
    List<AccountResponse> myAccounts() {
        return accountQueryService.accountsOf(currentUser.id()).stream()
                .map(AccountResponse::from)
                .toList();
    }

    /** GET /api/accounts/{id}: một tài khoản; của người khác thì trả 404 như không tồn tại. */
    @GetMapping("/{id}")
    AccountResponse myAccount(@PathVariable UUID id) {
        return AccountResponse.from(accountQueryService.accountOf(id, currentUser.id()));
    }
}
