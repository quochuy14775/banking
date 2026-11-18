package vn.corebank.account.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.corebank.account.application.AccountOpeningService;
import vn.corebank.account.domain.model.Account;
import vn.corebank.account.web.dto.AccountResponse;
import vn.corebank.account.web.dto.OpenAccountRequest;

import java.net.URI;

/**
 * API cho nhân viên ngân hàng: mở tài khoản cho một người dùng.
 * CHƯA được bảo vệ: phần 3 sẽ yêu cầu token Keycloak có quyền admin.
 */
@RestController
@RequestMapping("/api/admin/accounts")
@RequiredArgsConstructor
class AdminAccountController {

    private final AccountOpeningService accountOpeningService;

    /** POST /api/admin/accounts: trả 201 kèm header Location trỏ tới tài khoản vừa mở. */
    @PostMapping
    ResponseEntity<AccountResponse> open(@Valid @RequestBody OpenAccountRequest request) {
        Account account = accountOpeningService.open(request.ownerId(), request.productCode());
        return ResponseEntity
                .created(URI.create("/api/accounts/" + account.getId()))
                .body(AccountResponse.from(account));
    }
}
