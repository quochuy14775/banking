package vn.corebank.auth.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Bảo mật của auth-service: các API đăng ký, đăng nhập, làm mới, đăng xuất và khóa công khai thì ai cũng gọi được;
 * các API còn lại phải có access token hợp lệ.
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CORS cho app web (cấu hình chung ở common, khóa corebank.cors.allowed-origins).
                // Đặt trong chuỗi bảo mật để request OPTIONS hỏi trước của trình duyệt được trả lời trước bước kiểm tra token.
                .cors(Customizer.withDefaults())
                // API chỉ dùng token trong header, không dùng cookie, nên không cần chống CSRF.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/register", "/api/auth/login", "/api/auth/refresh", "/api/auth/logout")
                        .permitAll()
                        .requestMatchers(HttpMethod.GET, "/.well-known/jwks.json", "/actuator/health", "/actuator/info")
                        .permitAll()
                        // Swagger UI và tài liệu OpenAPI (chỉ để đọc tài liệu, không gọi được API cần token).
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**")
                        .permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter())));
        return http.build();
    }

    /**
     * Băm mật khẩu bằng BCrypt. Bản băm có tiền tố thuật toán ({@code {bcrypt}...}),
     * nên sau này đổi sang thuật toán khác vẫn đọc được mật khẩu cũ.
     */
    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    /** Đọc vai trò từ claim {@code roles} của token, thành quyền {@code ROLE_CUSTOMER}, {@code ROLE_ADMIN}. */
    static JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("roles");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }
}
