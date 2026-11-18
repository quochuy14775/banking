package vn.corebank.account.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Cấu hình riêng của account-service, đọc từ khóa {@code corebank.account.*} trong application.yaml.
 *
 * @param numberPrefix đầu số tài khoản, 4 chữ số
 */
@ConfigurationProperties(prefix = "corebank.account")
public record AccountProperties(@DefaultValue("1903") String numberPrefix) {

    public AccountProperties {
        if (numberPrefix == null || !numberPrefix.matches("\\d{4}")) {
            throw new IllegalArgumentException("corebank.account.number-prefix phải gồm đúng 4 chữ số: " + numberPrefix);
        }
    }
}
