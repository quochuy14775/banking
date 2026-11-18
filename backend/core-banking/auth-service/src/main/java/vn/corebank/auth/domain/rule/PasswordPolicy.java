package vn.corebank.auth.domain.rule;

import vn.corebank.auth.domain.exception.WeakPasswordException;

import java.nio.charset.StandardCharsets;

/** Quy tắc mật khẩu khi đăng ký hoặc đổi mật khẩu. */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 8;
    public static final int MAX_LENGTH = 64;
    /** BCrypt chỉ dùng 72 byte đầu của mật khẩu; Spring Security từ chối mật khẩu dài hơn. */
    private static final int MAX_BYTES = 72;

    private PasswordPolicy() {
    }

    /** Ném {@link WeakPasswordException} nếu mật khẩu không đạt. */
    public static void check(String password) {
        if (password == null || password.length() < MIN_LENGTH || password.length() > MAX_LENGTH) {
            throw new WeakPasswordException("Mật khẩu phải dài từ " + MIN_LENGTH + " đến " + MAX_LENGTH + " ký tự.");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
            throw new WeakPasswordException("Mật khẩu quá dài.");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new WeakPasswordException("Mật khẩu phải có cả chữ và số.");
        }
    }
}
