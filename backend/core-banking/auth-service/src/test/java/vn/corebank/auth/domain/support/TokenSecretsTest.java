package vn.corebank.auth.domain.support;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TokenSecretsTest {

    @Test
    void generatesDifferentUrlSafeTokens() {
        String first = TokenSecrets.generate();
        String second = TokenSecrets.generate();

        assertThat(first).hasSize(43).matches("[A-Za-z0-9_-]+");
        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void sha256MatchesKnownValue() {
        // Giá trị chuẩn của SHA-256("abc").
        assertThat(TokenSecrets.sha256("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }
}
