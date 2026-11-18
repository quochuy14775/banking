package vn.corebank.auth.application;

import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.corebank.auth.config.AuthProperties;
import vn.corebank.auth.domain.exception.InvalidCredentialsException;
import vn.corebank.auth.domain.exception.UserLockedException;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.repository.UserAccountRepository;
import vn.corebank.auth.domain.rule.UserAccountRules;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

// Test tầng application với repository giả (mock): kiểm tra luồng đăng nhập mà không cần database.
class LoginServiceTest {

    private static final Instant NOW = Instant.parse("2026-11-17T09:00:00Z");
    private static final int MAX_ATTEMPTS = 3;

    // Độ khó BCrypt thấp (4) để test chạy nhanh; khi chạy thật dùng mặc định (10).
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private final UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
    private final TokenPairIssuer tokenPairIssuer = mock(TokenPairIssuer.class);
    private final AuthProperties properties = new AuthProperties("http://localhost:9003",
            Duration.ofMinutes(15), Duration.ofDays(7), MAX_ATTEMPTS, Duration.ofMinutes(15));
    private final LoginService loginService = new LoginService(userAccountRepository, passwordEncoder,
            tokenPairIssuer, properties, Clock.fixed(NOW, ZoneOffset.UTC));

    private final UserAccount user = UserAccountRules.registerCustomer("an.nguyen", passwordEncoder.encode("matkhau123"), UUID.randomUUID());

    @Test
    void loginWithCorrectPasswordIssuesTokens() {
        AuthTokens tokens = new AuthTokens("access", NOW.plusSeconds(900), "refresh",
                NOW.plus(Duration.ofDays(7)), UUID.randomUUID(), NOW);
        given(userAccountRepository.findByUsername("an.nguyen")).willReturn(Optional.of(user));
        given(tokenPairIssuer.issue(eq(user), any(UUID.class), eq(NOW))).willReturn(tokens);

        // Tên đăng nhập được chuẩn hóa: khoảng trắng và chữ hoa không ảnh hưởng.
        assertThat(loginService.login("  An.Nguyen ", "matkhau123")).isSameAs(tokens);
        assertThat(user.getLastLoginAt()).isEqualTo(NOW);
    }

    @Test
    void wrongPasswordCountsFailureAndIssuesNothing() {
        given(userAccountRepository.findByUsername("an.nguyen")).willReturn(Optional.of(user));

        assertThatThrownBy(() -> loginService.login("an.nguyen", "saimatkhau1"))
                .isInstanceOf(InvalidCredentialsException.class);

        assertThat(user.getFailedLoginAttempts()).isEqualTo(1);
        verifyNoInteractions(tokenPairIssuer);
    }

    @Test
    void lockedAfterMaxFailuresEvenWithCorrectPassword() {
        given(userAccountRepository.findByUsername("an.nguyen")).willReturn(Optional.of(user));
        for (int i = 0; i < MAX_ATTEMPTS; i++) {
            assertThatThrownBy(() -> loginService.login("an.nguyen", "saimatkhau1"))
                    .isInstanceOf(InvalidCredentialsException.class);
        }

        assertThatThrownBy(() -> loginService.login("an.nguyen", "matkhau123"))
                .isInstanceOf(UserLockedException.class);
        verifyNoInteractions(tokenPairIssuer);
    }

    @Test
    void unknownUsernameLooksLikeWrongPassword() {
        given(userAccountRepository.findByUsername(anyString())).willReturn(Optional.empty());

        assertThatThrownBy(() -> loginService.login("khong.ton.tai", "matkhau123"))
                .isInstanceOf(InvalidCredentialsException.class);
        verifyNoInteractions(tokenPairIssuer);
    }
}
