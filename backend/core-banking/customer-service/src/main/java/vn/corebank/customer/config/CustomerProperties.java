package vn.corebank.customer.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Cấu hình customer-service, khai báo dưới {@code corebank.customer} trong application.yaml.
 *
 * @param internalToken mã bí mật dùng chung với các service khác (auth-service) để gọi API nội bộ {@code /internal/**}.
 *                      Đặt qua biến môi trường ở môi trường thật; hai service phải dùng cùng một giá trị.
 */
@ConfigurationProperties("corebank.customer")
public record CustomerProperties(String internalToken) {

    public CustomerProperties {
        if (internalToken == null || internalToken.isBlank()) {
            throw new IllegalArgumentException("corebank.customer.internal-token không được để trống");
        }
    }
}
