package vn.corebank.auth.application;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.auth.config.AuthProperties;
import vn.corebank.auth.domain.exception.InvalidCredentialsException;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.repository.UserAccountRepository;
import vn.corebank.auth.domain.rule.UserAccountRules;
import vn.corebank.auth.domain.support.TokenSecrets;
import vn.corebank.auth.domain.support.Usernames;

import java.time.Clock;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Đăng nhập bằng tên đăng nhập và mật khẩu; thành công thì mở một phiên mới và cấp cặp token. */
@Service
public class LoginService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenPairIssuer tokenPairIssuer;
    private final AuthProperties properties;
    private final Clock clock;

    /**
     * Bản băm của một mật khẩu ngẫu nhiên. Khi tên đăng nhập không tồn tại, vẫn so khớp với bản băm này
     * để thời gian phản hồi giống hệt trường hợp sai mật khẩu: kẻ xấu không đo thời gian để dò tên đăng nhập được.
     */
    private final String dummyPasswordHash;

    LoginService(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder,
                 TokenPairIssuer tokenPairIssuer, AuthProperties properties, Clock clock) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenPairIssuer = tokenPairIssuer;
        this.properties = properties;
        this.clock = clock;
        this.dummyPasswordHash = passwordEncoder.encode(TokenSecrets.generate());
    }

    /**
     * noRollbackFor: khi sai mật khẩu, số lần sai vừa tăng phải được LƯU dù hàm ném lỗi.
     * Mặc định Spring hoàn tác transaction khi có lỗi, như vậy sẽ không bao giờ khóa được tài khoản.
     */
    @Transactional(noRollbackFor = InvalidCredentialsException.class)
    public AuthTokens login(String username, String rawPassword) {
        Instant now = clock.instant();
        Optional<UserAccount> found = userAccountRepository.findByUsername(Usernames.normalize(username));
        if (found.isEmpty()) {
            passwordEncoder.matches(rawPassword, dummyPasswordHash);
            throw new InvalidCredentialsException();
        }

        UserAccount user = found.get();
        UserAccountRules.ensureCanLogIn(user, now);
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            UserAccountRules.recordFailedLogin(user, now, properties.maxFailedAttempts(), properties.lockDuration());
            throw new InvalidCredentialsException();
        }

        UserAccountRules.recordSuccessfulLogin(user, now);
        return tokenPairIssuer.issue(user, UUID.randomUUID(), now);
    }
}
