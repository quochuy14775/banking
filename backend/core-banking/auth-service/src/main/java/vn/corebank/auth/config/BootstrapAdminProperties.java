package vn.corebank.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Tài khoản nhân viên (ADMIN) tạo sẵn khi khởi động, để có người duyệt hồ sơ đăng ký khi chạy demo.
 * Đọc từ khóa {@code corebank.bootstrap-admin.*}; để trống thì không tạo. Mật khẩu đặt qua biến môi trường,
 * không ghi vào file cấu hình hay migration.
 */
@ConfigurationProperties(prefix = "corebank.bootstrap-admin")
public record BootstrapAdminProperties(String username, String password) {

    public boolean enabled() {
        return username != null && !username.isBlank() && password != null && !password.isBlank();
    }
}
