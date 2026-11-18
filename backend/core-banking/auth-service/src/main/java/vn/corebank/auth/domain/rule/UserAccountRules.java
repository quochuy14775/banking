package vn.corebank.auth.domain.rule;

import vn.corebank.auth.domain.exception.UserDisabledException;
import vn.corebank.auth.domain.exception.UserLockedException;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.model.UserRole;
import vn.corebank.auth.domain.model.UserStatus;
import vn.corebank.auth.domain.support.Usernames;
import vn.corebank.common.support.Validation;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Hàm nghiệp vụ của tài khoản đăng nhập: đăng ký, kiểm tra trước khi đăng nhập, khóa khi sai mật khẩu nhiều lần.
 * Không kiểm tra mật khẩu ở đây: việc so khớp bản băm do tầng application làm bằng PasswordEncoder.
 */
public final class UserAccountRules {

    private UserAccountRules() {
    }

    /**
     * Tạo tài khoản đăng nhập cho khách hàng đã được duyệt hồ sơ ở customer-service. {@code passwordHash} phải là mật
     * khẩu ĐÃ BĂM.
     */
    public static UserAccount registerCustomer(String username, String passwordHash, UUID customerId) {
        UserAccount user = create(username, passwordHash, UserRole.CUSTOMER);
        user.setCustomerId(Objects.requireNonNull(customerId, "customerId"));
        return user;
    }

    /** Tạo tài khoản nhân viên (vai trò ADMIN), không gắn với khách hàng nào. */
    public static UserAccount registerStaff(String username, String passwordHash) {
        return create(username, passwordHash, UserRole.ADMIN);
    }

    private static UserAccount create(String username, String passwordHash, UserRole role) {
        String normalized = Usernames.normalize(username);
        if (!Usernames.isValid(normalized)) {
            throw new IllegalArgumentException("Tên đăng nhập không hợp lệ: " + username);
        }
        UserAccount user = new UserAccount(UUID.randomUUID());
        user.setUsername(normalized);
        user.setPasswordHash(Validation.requireText(passwordHash, "passwordHash"));
        user.setRole(Objects.requireNonNull(role, "role"));
        user.setStatus(UserStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        return user;
    }

    /** Kiểm tra trước khi cho đăng nhập hoặc cấp token mới. */
    public static void ensureCanLogIn(UserAccount user, Instant now) {
        if (user.getStatus() == UserStatus.DISABLED) {
            throw new UserDisabledException();
        }
        if (isLocked(user, now)) {
            throw new UserLockedException();
        }
    }

    public static boolean isLocked(UserAccount user, Instant now) {
        return user.getLockedUntil() != null && now.isBefore(user.getLockedUntil());
    }

    /**
     * Ghi nhận một lần nhập sai mật khẩu. Sai đủ {@code maxAttempts} lần liên tiếp thì khóa {@code lockDuration}.
     *
     * @return true nếu lần sai này làm tài khoản bị khóa
     */
    public static boolean recordFailedLogin(UserAccount user, Instant now, int maxAttempts, Duration lockDuration) {
        int attempts = user.getFailedLoginAttempts() + 1;
        if (attempts >= maxAttempts) {
            user.setLockedUntil(now.plus(lockDuration));
            user.setFailedLoginAttempts(0);
            return true;
        }
        user.setFailedLoginAttempts(attempts);
        return false;
    }

    /** Đăng nhập đúng: xóa số lần sai và mở khóa. */
    public static void recordSuccessfulLogin(UserAccount user, Instant now) {
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(now);
    }

    /** Vô hiệu hóa tài khoản đăng nhập, ví dụ khi khách báo mất điện thoại. */
    public static void disable(UserAccount user) {
        user.setStatus(UserStatus.DISABLED);
    }
}
