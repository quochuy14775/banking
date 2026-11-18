package vn.corebank.auth.domain.support;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class UsernamesTest {

    @Test
    void normalizesSpacesAndCase() {
        assertThat(Usernames.normalize("  An.Nguyen ")).isEqualTo("an.nguyen");
        assertThat(Usernames.normalize(null)).isEmpty();
    }

    @Test
    void validatesFormat() {
        assertThat(Usernames.isValid("an.nguyen")).isTrue();
        assertThat(Usernames.isValid("an nguyen")).isFalse();
        assertThat(Usernames.isValid("abc")).isFalse();
    }
}
