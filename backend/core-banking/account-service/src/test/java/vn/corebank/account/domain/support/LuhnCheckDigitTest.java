package vn.corebank.account.domain.support;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class LuhnCheckDigitTest {

    @Test
    void computesKnownCheckDigit() {
        // Ví dụ kinh điển của thuật toán Luhn: 7992739871 → chữ số kiểm tra 3.
        assertThat(LuhnCheckDigit.compute("7992739871")).isEqualTo(3);
    }

    @Test
    void validatesNumberWithCheckDigit() {
        assertThat(LuhnCheckDigit.isValid("79927398713")).isTrue();
    }

    @Test
    void detectsSingleDigitTypo() {
        assertThat(LuhnCheckDigit.isValid("79927398714")).isFalse();
        assertThat(LuhnCheckDigit.isValid("79927398813")).isFalse();
    }

    @Test
    void generatedAccountNumbersAreValid() {
        String body = "19030000001";
        String number = body + LuhnCheckDigit.compute(body);

        assertThat(number).hasSize(12);
        assertThat(LuhnCheckDigit.isValid(number)).isTrue();
    }

    @Test
    void rejectsNonDigits() {
        assertThatIllegalArgumentException().isThrownBy(() -> LuhnCheckDigit.compute("1903A"));
        assertThat(LuhnCheckDigit.isValid("1903-0000")).isFalse();
    }
}
