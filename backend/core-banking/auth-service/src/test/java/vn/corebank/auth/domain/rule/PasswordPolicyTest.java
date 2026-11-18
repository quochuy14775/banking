package vn.corebank.auth.domain.rule;

import org.junit.jupiter.api.Test;
import vn.corebank.auth.domain.exception.WeakPasswordException;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    @Test
    void acceptsStrongPassword() {
        assertThatNoException().isThrownBy(() -> PasswordPolicy.check("matkhau123"));
    }

    @Test
    void rejectsShortPassword() {
        assertThatThrownBy(() -> PasswordPolicy.check("abc123"))
                .isInstanceOf(WeakPasswordException.class)
                .hasFieldOrPropertyWithValue("code", WeakPasswordException.CODE);
    }

    @Test
    void rejectsPasswordWithoutDigit() {
        assertThatThrownBy(() -> PasswordPolicy.check("chicochu")).isInstanceOf(WeakPasswordException.class);
    }

    @Test
    void rejectsPasswordWithoutLetter() {
        assertThatThrownBy(() -> PasswordPolicy.check("12345678")).isInstanceOf(WeakPasswordException.class);
    }

    @Test
    void rejectsPasswordLongerThanBcryptLimit() {
        // 30 ký tự có dấu, mỗi ký tự 3 byte UTF-8: 90 byte, vượt giới hạn 72 byte của BCrypt.
        assertThatThrownBy(() -> PasswordPolicy.check("ệ".repeat(30) + "1"))
                .isInstanceOf(WeakPasswordException.class);
    }
}
