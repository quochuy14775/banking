package vn.corebank.account.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.corebank.account.application.AccountOpeningService;
import vn.corebank.account.application.AccountQueryService;
import vn.corebank.account.config.SecurityConfig;
import vn.corebank.account.domain.exception.AccountNotFoundException;
import vn.corebank.account.domain.model.Account;
import vn.corebank.account.domain.rule.AccountRules;
import vn.corebank.common.autoconfigure.CommonAutoConfiguration;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Chỉ dựng tầng web (controller, xử lý lỗi, CORS, JSON); tầng application được thay bằng mock nên không cần database.
// @WebMvcTest không tự nạp cấu hình tự động của common, nên nạp thêm CommonAutoConfiguration (xử lý lỗi, CORS) như lúc chạy thật.
@WebMvcTest(controllers = {AccountController.class, AdminAccountController.class},
        properties = "corebank.cors.allowed-origins=http://localhost:8081")
@Import({SecurityConfig.class, CurrentUser.class})
@ImportAutoConfiguration(CommonAutoConfiguration.class)
class AccountControllerTest {

    private static final Instant OPENED_AT = Instant.parse("2026-11-16T09:00:00Z");

    // Origin của app web được mở CORS, khớp với properties của @WebMvcTest phía trên.
    private static final String WEB_ORIGIN = "http://localhost:8081";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AccountQueryService accountQueryService;

    @MockitoBean
    private AccountOpeningService accountOpeningService;

    private static Account account(String number, String ownerId) {
        return AccountRules.open(number, ownerId, "CASA_VND", "VND", OPENED_AT);
    }

    @Test
    void listsAccountsOfCurrentUser() throws Exception {
        given(accountQueryService.accountsOf("user-a"))
                .willReturn(List.of(account("190300000017", "user-a")));

        mockMvc.perform(get("/api/accounts").header(CurrentUser.HEADER, "user-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].accountNumber").value("190300000017"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].openedAt").value("2026-11-16T09:00:00Z"));
    }

    @Test
    void rejectsRequestWithoutUser() throws Exception {
        mockMvc.perform(get("/api/accounts"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(accountQueryService);
    }

    @Test
    void accountOfAnotherUserLooksNotFound() throws Exception {
        UUID id = UUID.randomUUID();
        given(accountQueryService.accountOf(id, "user-a")).willThrow(new AccountNotFoundException());

        mockMvc.perform(get("/api/accounts/{id}", id).header(CurrentUser.HEADER, "user-a"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(AccountNotFoundException.CODE));
    }

    @Test
    void invalidAccountIdIsBadRequest() throws Exception {
        mockMvc.perform(get("/api/accounts/{id}", "not-a-uuid").header(CurrentUser.HEADER, "user-a"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void opensAccount() throws Exception {
        Account opened = account("190300000017", "user-a");
        given(accountOpeningService.open(eq("user-a"), eq("CASA_VND"))).willReturn(opened);

        mockMvc.perform(post("/api/admin/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ownerId": "user-a", "productCode": "CASA_VND"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/accounts/" + opened.getId()))
                .andExpect(jsonPath("$.accountNumber").value("190300000017"));
    }

    @Test
    void rejectsInvalidOpenRequest() throws Exception {
        mockMvc.perform(post("/api/admin/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ownerId": "", "productCode": "casa vnd"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.ownerId").exists())
                .andExpect(jsonPath("$.errors.productCode").exists());

        verifyNoInteractions(accountOpeningService);
    }

    // Trình duyệt hỏi trước bằng OPTIONS (preflight) vì request từ app web có header X-User-Id.
    @Test
    void corsPreflightFromWebAppIsAllowed() throws Exception {
        mockMvc.perform(options("/api/accounts")
                        .header(HttpHeaders.ORIGIN, WEB_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, CurrentUser.HEADER))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, WEB_ORIGIN));

        verifyNoInteractions(accountQueryService);
    }
}
