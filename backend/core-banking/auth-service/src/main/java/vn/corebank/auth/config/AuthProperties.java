package vn.corebank.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.time.Duration;

/**
 * Cấu hình riêng của auth-service, đọc từ khóa {@code corebank.auth.*} trong application.yaml.
 *
 * @param issuer            định danh của nơi cấp token, ghi vào claim {@code iss}
 * @param accessTokenTtl    thời hạn access token
 * @param refreshTokenTtl   thời hạn refresh token
 * @param maxFailedAttempts nhập sai mật khẩu đủ số lần này liên tiếp thì khóa đăng nhập
 * @param lockDuration      thời gian khóa đăng nhập
 */
@ConfigurationProperties(prefix = "corebank.auth")
public record AuthProperties(
        @DefaultValue("http://localhost:9003") String issuer,
        @DefaultValue("15m") Duration accessTokenTtl,
        @DefaultValue("7d") Duration refreshTokenTtl,
        @DefaultValue("5") int maxFailedAttempts,
        @DefaultValue("15m") Duration lockDuration) {

    public AuthProperties {
        if (issuer == null || issuer.isBlank()) {
            throw new IllegalArgumentException("corebank.auth.issuer không được để trống");
        }
        if (accessTokenTtl.isNegative() || accessTokenTtl.isZero()
                || refreshTokenTtl.compareTo(accessTokenTtl) <= 0) {
            throw new IllegalArgumentException("Thời hạn refresh token phải dài hơn access token, và cả hai phải lớn hơn 0");
        }
        if (maxFailedAttempts < 1 || lockDuration.isNegative() || lockDuration.isZero()) {
            throw new IllegalArgumentException("max-failed-attempts phải từ 1 trở lên và lock-duration phải lớn hơn 0");
        }
    }
}
