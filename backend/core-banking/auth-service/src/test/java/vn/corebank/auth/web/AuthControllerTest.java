package vn.corebank.auth.web;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.corebank.auth.application.AuthTokens;
import vn.corebank.auth.application.LoginService;
import vn.corebank.auth.application.RegistrationService;
import vn.corebank.auth.application.SessionService;
import vn.corebank.auth.config.SecurityConfig;
import vn.corebank.auth.domain.exception.InvalidCredentialsException;
import vn.corebank.auth.domain.exception.OnboardingNotApprovedException;
import vn.corebank.auth.domain.exception.UsernameTakenException;
import vn.corebank.auth.domain.rule.UserAccountRules;
import vn.corebank.common.autoconfigure.CommonAutoConfiguration;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Chỉ dựng tầng web (controller, bảo mật, xử lý lỗi, CORS, JSON); tầng application được thay bằng mock nên không cần database.
// @WebMvcTest không tự nạp cấu hình tự động của common, nên nạp thêm CommonAutoConfiguration (xử lý lỗi, CORS) như lúc chạy thật.
@WebMvcTest(controllers = AuthController.class, properties = "corebank.cors.allowed-origins=http://localhost:8081")
@Import(SecurityConfig.class)
@ImportAutoConfiguration(CommonAutoConfiguration.class)
class AuthControllerTest {

    private static final Instant NOW = Instant.parse("2026-11-17T09:00:00Z");

    // Origin của app web được mở CORS, khớp với properties của @WebMvcTest phía trên.
    private static final String WEB_ORIGIN = "http://localhost:8081";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RegistrationService registrationService;

    @MockitoBean
    private LoginService loginService;

    @MockitoBean
    private SessionService sessionService;

    // SecurityConfig cần bộ kiểm tra token; test /me dùng token giả của spring-security-test nên không gọi tới bộ này.
    @MockitoBean
    private JwtDecoder jwtDecoder;

    private static final UUID APPLICATION_ID = UUID.fromString("7b0c8d1e-2f3a-4b5c-8d9e-0f1a2b3c4d5e");
    private static final String REGISTER_BODY = """
            {"username": "an.nguyen", "password": "matkhau123",
             "applicationId": "7b0c8d1e-2f3a-4b5c-8d9e-0f1a2b3c4d5e", "accessCode": "ma-tra-cuu"}
            """;

    @Test
    void registerReturnsCreatedUserWithoutPassword() throws Exception {
        UUID customerId = UUID.randomUUID();
        given(registrationService.register("an.nguyen", "matkhau123", APPLICATION_ID, "ma-tra-cuu"))
                .willReturn(UserAccountRules.registerCustomer("an.nguyen", "{bcrypt}hash", customerId));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("an.nguyen"))
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"))
                .andExpect(jsonPath("$.customerId").value(customerId.toString()))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void registerRejectsInvalidBody() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username": "a b", "password": ""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.errors.username").exists())
                .andExpect(jsonPath("$.errors.password").exists())
                .andExpect(jsonPath("$.errors.applicationId").exists())
                .andExpect(jsonPath("$.errors.accessCode").exists());

        verifyNoInteractions(registrationService);
    }

    @Test
    void registerDuplicateUsernameIsConflict() throws Exception {
        given(registrationService.register("an.nguyen", "matkhau123", APPLICATION_ID, "ma-tra-cuu"))
                .willThrow(new UsernameTakenException());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(UsernameTakenException.CODE));
    }

    @Test
    void registerBeforeApprovalIsConflict() throws Exception {
        given(registrationService.register("an.nguyen", "matkhau123", APPLICATION_ID, "ma-tra-cuu"))
                .willThrow(new OnboardingNotApprovedException());

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(OnboardingNotApprovedException.CODE));
    }

    @Test
    void loginReturnsTokens() throws Exception {
        given(loginService.login("an.nguyen", "matkhau123")).willReturn(new AuthTokens(
                "access-token", NOW.plus(Duration.ofMinutes(15)), "refresh-token", NOW.plus(Duration.ofDays(7)),
                UUID.randomUUID(), NOW));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username": "an.nguyen", "password": "matkhau123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.refreshToken").value("refresh-token"))
                .andExpect(jsonPath("$.refreshExpiresIn").value(604800))
                // Mã refresh token trong database là dữ liệu nội bộ, không trả cho app.
                .andExpect(jsonPath("$.refreshTokenId").doesNotExist());
    }

    @Test
    void loginWithWrongPasswordIsUnauthorized() throws Exception {
        given(loginService.login("an.nguyen", "saimatkhau1")).willThrow(new InvalidCredentialsException());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username": "an.nguyen", "password": "saimatkhau1"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(InvalidCredentialsException.CODE));
    }

    @Test
    void logoutReturnsNoContent() throws Exception {
        mockMvc.perform(post("/api/auth/logout")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"refreshToken": "refresh-token"}
                                """))
                .andExpect(status().isNoContent());

        verify(sessionService).logout("refresh-token");
    }

    @Test
    void meRequiresAccessToken() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void meReadsUserFromAccessToken() throws Exception {
        UUID userId = UUID.randomUUID();

        mockMvc.perform(get("/api/auth/me").with(jwt().jwt(token -> token
                        .subject(userId.toString())
                        .claim("preferred_username", "an.nguyen")
                        .claim("roles", List.of("CUSTOMER")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("an.nguyen"))
                .andExpect(jsonPath("$.roles[0]").value("CUSTOMER"));
    }

    // Trình duyệt hỏi trước bằng OPTIONS (preflight) rồi mới gửi POST đăng ký từ app web.
    @Test
    void corsPreflightFromWebAppIsAllowed() throws Exception {
        mockMvc.perform(options("/api/auth/register")
                        .header(HttpHeaders.ORIGIN, WEB_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS, "content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, WEB_ORIGIN));

        verifyNoInteractions(registrationService);
    }

    @Test
    void corsPreflightFromUnknownOriginIsRejected() throws Exception {
        mockMvc.perform(options("/api/auth/register")
                        .header(HttpHeaders.ORIGIN, "http://evil.example")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
