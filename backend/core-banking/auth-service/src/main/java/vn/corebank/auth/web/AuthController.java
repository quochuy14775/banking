package vn.corebank.auth.web;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import vn.corebank.auth.application.LoginService;
import vn.corebank.auth.application.RegistrationService;
import vn.corebank.auth.application.SessionService;
import vn.corebank.auth.web.dto.LoginRequest;
import vn.corebank.auth.web.dto.RefreshTokenRequest;
import vn.corebank.auth.web.dto.RegisterRequest;
import vn.corebank.auth.web.dto.TokenResponse;
import vn.corebank.auth.web.dto.UserResponse;

import java.util.List;
import java.util.UUID;

/**
 * API đăng nhập cho app. Controller chỉ nhận request, gọi tầng application và đổi kết quả sang DTO.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
class AuthController {

    private final RegistrationService registrationService;
    private final LoginService loginService;
    private final SessionService sessionService;

    /**
     * POST /api/auth/register: tạo tài khoản đăng nhập cho khách có hồ sơ đăng ký đã được duyệt, trả 201.
     * Hồ sơ chưa duyệt trả 409, sai mã hồ sơ hoặc mã tra cứu trả 404.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    UserResponse register(@Valid @RequestBody RegisterRequest request) {
        return UserResponse.from(registrationService.register(request.username(), request.password(),
                request.applicationId(), request.accessCode()));
    }

    /** POST /api/auth/login: trả cặp token. Sai tên hoặc mật khẩu đều trả 401 với cùng một thông báo. */
    @PostMapping("/login")
    TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return TokenResponse.from(loginService.login(request.username(), request.password()));
    }

    /** POST /api/auth/refresh: đổi refresh token lấy cặp token mới; refresh token cũ hết hiệu lực. */
    @PostMapping("/refresh")
    TokenResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return TokenResponse.from(sessionService.refresh(request.refreshToken()));
    }

    /** POST /api/auth/logout: thu hồi phiên đăng nhập, trả 204. */
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@Valid @RequestBody RefreshTokenRequest request) {
        sessionService.logout(request.refreshToken());
    }

    /** GET /api/auth/me: người đang đăng nhập, đọc thẳng từ access token (cần header Authorization). */
    @GetMapping("/me")
    UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        List<String> roles = jwt.getClaimAsStringList("roles");
        String customerId = jwt.getClaimAsString("customer_id");
        return new UserResponse(UUID.fromString(jwt.getSubject()), jwt.getClaimAsString("preferred_username"),
                roles == null ? List.of() : roles, customerId == null ? null : UUID.fromString(customerId));
    }
}
