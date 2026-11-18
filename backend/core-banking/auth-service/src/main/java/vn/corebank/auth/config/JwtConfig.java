package vn.corebank.auth.config;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.KeyUse;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

/**
 * Khóa ký JWT và bộ ký, bộ kiểm tra token.
 *
 * <p>Token ký bằng khóa RSA bí mật; các service khác kiểm tra bằng khóa công khai lấy từ
 * {@code GET /.well-known/jwks.json}, nên không phải gọi sang auth-service trên mỗi request.
 *
 * <p>BẢN ĐẦU: khóa được sinh mới mỗi lần auth-service khởi động. Hệ quả: access token cũ (tối đa 15 phút)
 * hết hiệu lực sau khi khởi động lại; refresh token vẫn dùng được vì nằm trong database, nên app chỉ cần làm mới.
 * Khi chạy nhiều bản auth-service hoặc deploy thật, phải chuyển sang khóa lưu cố định (file bí mật hoặc Vault).
 */
@Slf4j
@Configuration
public class JwtConfig {

    private static final int RSA_KEY_SIZE = 2048;

    @Bean
    RSAKey jwtSigningKey() {
        KeyPair keyPair = generateRsaKeyPair();
        RSAKey key = new RSAKey.Builder((RSAPublicKey) keyPair.getPublic())
                .privateKey((RSAPrivateKey) keyPair.getPrivate())
                .keyID(UUID.randomUUID().toString())
                .keyUse(KeyUse.SIGNATURE)
                .algorithm(JWSAlgorithm.RS256)
                .build();
        log.warn("Đang dùng khóa ký JWT sinh tạm lúc khởi động (kid={}). Access token cũ sẽ hết hiệu lực khi khởi động lại.",
                key.getKeyID());
        return key;
    }

    @Bean
    JwtEncoder jwtEncoder(RSAKey jwtSigningKey) {
        return new NimbusJwtEncoder(new ImmutableJWKSet<>(new JWKSet(jwtSigningKey)));
    }

    /** Dùng để kiểm tra token của chính auth-service (ví dụ API /me): kiểm tra chữ ký, thời hạn và issuer. */
    @Bean
    JwtDecoder jwtDecoder(RSAKey jwtSigningKey, AuthProperties properties) throws JOSEException {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(jwtSigningKey.toRSAPublicKey()).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
        return decoder;
    }

    private static KeyPair generateRsaKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(RSA_KEY_SIZE);
            return generator.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            // Mọi JDK đều bắt buộc có RSA, nên không thể xảy ra.
            throw new IllegalStateException("JDK không hỗ trợ RSA", e);
        }
    }
}
