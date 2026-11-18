package vn.corebank.common.autoconfigure;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.http.HttpHeaders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import vn.corebank.common.web.GlobalExceptionHandler;

import java.time.Clock;
import java.time.Duration;
import java.util.List;

/**
 * Cấu hình dùng chung, tự bật ở mọi service có dependency {@code common}
 * (đăng ký trong META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports).
 * Service không cần {@code @Import} gì; muốn khác thì tự khai báo bean cùng loại để thay thế.
 */
@AutoConfiguration
@EnableConfigurationProperties(CorsProperties.class)
public class CommonAutoConfiguration {

    /**
     * Đồng hồ dùng chung. Code nghiệp vụ lấy thời gian qua {@link Clock} thay vì gọi {@code Instant.now()},
     * để test đặt được thời gian cố định.
     */
    @Bean
    @ConditionalOnMissingBean
    Clock clock() {
        return Clock.systemUTC();
    }

    /** Xử lý lỗi HTTP chung, chỉ bật ở service có web. */
    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    @ConditionalOnMissingBean
    GlobalExceptionHandler globalExceptionHandler() {
        return new GlobalExceptionHandler();
    }

    /**
     * CORS cho app web gọi API từ origin khác (vd. Expo web ở {@code http://localhost:8081}).
     * Có hiệu lực khi SecurityConfig của service bật {@code http.cors(...)}: Spring Security tìm bean theo đúng tên
     * {@code corsConfigurationSource}, nên giữ nguyên tên này. Chưa khai báo {@code corebank.cors.allowed-origins}
     * thì không mở cho origin nào, giống như chưa có CORS.
     */
    @Bean
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    @ConditionalOnMissingBean(name = "corsConfigurationSource")
    CorsConfigurationSource corsConfigurationSource(CorsProperties properties) {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        if (properties.allowedOrigins().isEmpty()) {
            return source;
        }
        CorsConfiguration cors = new CorsConfiguration();
        cors.setAllowedOrigins(properties.allowedOrigins());
        cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
        cors.setAllowedHeaders(List.of("*"));
        // Cho trình duyệt đọc header Location mà API tạo mới trả về.
        cors.setExposedHeaders(List.of(HttpHeaders.LOCATION));
        // Token gửi trong header Authorization, không dùng cookie, nên không cho gửi kèm cookie.
        cors.setAllowCredentials(false);
        // Trình duyệt nhớ kết quả preflight (request OPTIONS hỏi trước) trong 1 giờ.
        cors.setMaxAge(Duration.ofHours(1));
        source.registerCorsConfiguration("/**", cors);
        return source;
    }
}
