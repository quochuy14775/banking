package vn.corebank.auth.application;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.auth.config.BootstrapAdminProperties;
import vn.corebank.auth.domain.repository.UserAccountRepository;
import vn.corebank.auth.domain.rule.PasswordPolicy;
import vn.corebank.auth.domain.rule.UserAccountRules;
import vn.corebank.auth.domain.support.Usernames;

/**
 * Khi khởi động: nếu có cấu hình {@code corebank.bootstrap-admin} và tên đó chưa có thì tạo tài khoản nhân viên (ADMIN)
 * để duyệt hồ sơ đăng ký. Đã có thì bỏ qua, không đổi mật khẩu. Chỉ dành cho demo; môi trường thật quản lý nhân viên
 * qua quy trình riêng.
 */
@Component
@RequiredArgsConstructor
class StaffBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(StaffBootstrap.class);

    private final BootstrapAdminProperties properties;
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!properties.enabled()) {
            return;
        }
        String username = Usernames.normalize(properties.username());
        if (userAccountRepository.existsByUsername(username)) {
            return;
        }
        PasswordPolicy.check(properties.password());
        userAccountRepository.save(UserAccountRules.registerStaff(username, passwordEncoder.encode(properties.password())));
        log.info("Đã tạo tài khoản nhân viên {}", username);
    }
}
