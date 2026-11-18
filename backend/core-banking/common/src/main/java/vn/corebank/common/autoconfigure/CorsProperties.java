package vn.corebank.common.autoconfigure;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * Cấu hình CORS dùng chung cho mọi service, đọc từ khóa {@code corebank.cors.*} trong application.yaml.
 * CORS là luật của trình duyệt: chỉ app web chạy ở origin khác (vd. Expo web) mới cần mở;
 * app điện thoại native, Postman, curl không bị CORS chặn.
 *
 * @param allowedOrigins các origin được gọi API, ghi đủ scheme, host và cổng, vd. {@code http://localhost:8081}.
 *                       Để trống thì không mở cho origin nào.
 */
@ConfigurationProperties(prefix = "corebank.cors")
public record CorsProperties(List<String> allowedOrigins) {

    public CorsProperties {
        allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
    }
}
