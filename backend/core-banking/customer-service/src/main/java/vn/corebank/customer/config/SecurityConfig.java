package vn.corebank.customer.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Bảo mật của customer-service:
 * <ul>
 *   <li>Khách chưa có tài khoản đăng nhập nên API gửi hồ sơ và xem trạng thái hồ sơ là công khai (xem trạng thái phải có
 *       mã tra cứu).</li>
 *   <li>API nội bộ {@code /internal/**} để service khác gọi: không dùng token người dùng mà kiểm mã bí mật nội bộ trong
 *       controller.</li>
 *   <li>API duyệt hồ sơ {@code /api/admin/**}: access token do auth-service cấp, vai trò ADMIN.</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CORS cho app web (cấu hình chung ở common, khóa corebank.cors.allowed-origins). Đặt trong chuỗi bảo
                // mật để request OPTIONS hỏi trước của trình duyệt được trả lời trước bước kiểm tra token.
                .cors(Customizer.withDefaults())
                // API chỉ dùng token trong header, không dùng cookie, nên không cần chống CSRF.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/onboarding/applications").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/onboarding/applications/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/internal/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/actuator/health", "/actuator/info").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    /** Đọc vai trò từ claim {@code roles} của token auth-service, thành quyền {@code ROLE_CUSTOMER}, {@code ROLE_ADMIN}. */
    static JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("roles");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
}
