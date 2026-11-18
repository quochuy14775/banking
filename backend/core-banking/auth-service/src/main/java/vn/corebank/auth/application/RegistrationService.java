package vn.corebank.auth.application;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.auth.domain.exception.CustomerAlreadyHasLoginException;
import vn.corebank.auth.domain.exception.UsernameTakenException;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.port.CustomerDirectory;
import vn.corebank.auth.domain.repository.UserAccountRepository;
import vn.corebank.auth.domain.rule.PasswordPolicy;
import vn.corebank.auth.domain.rule.UserAccountRules;
import vn.corebank.auth.domain.support.Usernames;

import java.util.UUID;

/**
 * Đăng ký tài khoản đăng nhập cho khách hàng. Chỉ khách có hồ sơ đăng ký đã được nhân viên duyệt ở customer-service mới
 * tạo được: app gửi mã hồ sơ và mã tra cứu, auth-service hỏi customer-service để lấy mã khách hàng (customerId).
 */
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final CustomerDirectory customerDirectory;

    /**
     * Kiểm tra mật khẩu và tên đăng nhập trước (không cần gọi service khác), rồi mới hỏi customer-service. Mỗi khách
     * chỉ có một tài khoản đăng nhập: ràng buộc UNIQUE trên customer_id chặn cả trường hợp hai request cùng lúc.
     */
    @Transactional
    public UserAccount register(String username, String rawPassword, UUID applicationId, String accessCode) {
        PasswordPolicy.check(rawPassword);
        String normalized = Usernames.normalize(username);
        if (userAccountRepository.existsByUsername(normalized)) {
            throw new UsernameTakenException();
        }
        UUID customerId = customerDirectory.verifyApprovedApplicant(applicationId, accessCode);
        if (userAccountRepository.existsByCustomerId(customerId)) {
            throw new CustomerAlreadyHasLoginException();
        }
        UserAccount user = UserAccountRules.registerCustomer(normalized, passwordEncoder.encode(rawPassword), customerId);
        try {
            // flush ngay để nếu hai request trùng tên hoặc trùng khách đến cùng lúc, request sau gặp lỗi trùng ở đây
            // (ràng buộc UNIQUE) và nhận lỗi rõ ràng thay vì lỗi 500.
            return userAccountRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            if (userAccountRepository.existsByCustomerId(customerId)) {
                throw new CustomerAlreadyHasLoginException();
            }
            throw new UsernameTakenException();
        }
    }
}
