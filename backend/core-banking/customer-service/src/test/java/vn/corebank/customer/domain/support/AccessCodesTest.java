package vn.corebank.customer.domain.support;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AccessCodesTest {

    @Test
    void generatesUrlSafeRandomCodes() {
        String first = AccessCodes.generate();
        String second = AccessCodes.generate();

        assertThat(first).hasSize(24).matches("[A-Za-z0-9_-]+");
        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void matchesOnlyTheOriginalCode() {
        String code = AccessCodes.generate();
        String hash = AccessCodes.hash(code);

        assertThat(hash).hasSize(64).doesNotContain(code);
        assertThat(AccessCodes.matches(code, hash)).isTrue();
        assertThat(AccessCodes.matches(code + "x", hash)).isFalse();
        assertThat(AccessCodes.matches(null, hash)).isFalse();
        assertThat(AccessCodes.matches("", hash)).isFalse();
    }
}
