package vn.corebank.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.net.URI;
import java.time.Duration;

/**
 * Cách gọi customer-service, đọc từ khóa {@code corebank.customer-service.*}.
 *
 * @param url           địa chỉ customer-service
 * @param internalToken mã bí mật dùng chung để gọi API nội bộ {@code /internal/**}; phải trùng với
 *                      {@code corebank.customer.internal-token} của customer-service
 * @param timeout       thời gian chờ tối đa mỗi lần gọi
 */
@ConfigurationProperties(prefix = "corebank.customer-service")
public record CustomerServiceProperties(
        @DefaultValue("http://localhost:9001") URI url,
        String internalToken,
        @DefaultValue("5s") Duration timeout) {

    public CustomerServiceProperties {
        if (internalToken == null || internalToken.isBlank()) {
            throw new IllegalArgumentException("corebank.customer-service.internal-token không được để trống");
        }
    }
}
