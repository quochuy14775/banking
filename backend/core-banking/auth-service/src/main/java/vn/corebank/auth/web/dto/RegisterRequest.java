package vn.corebank.auth.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

/**
 * Dữ liệu đăng ký tài khoản đăng nhập. Độ mạnh mật khẩu do PasswordPolicy ở tầng domain kiểm tra.
 * {@code applicationId} và {@code accessCode} là mã hồ sơ đăng ký và mã tra cứu app nhận khi gửi hồ sơ ở customer-service;
 * hồ sơ phải đã được duyệt.
 */
public record RegisterRequest(

        @NotBlank(message = "Không được để trống")
        @Pattern(regexp = "\\s*[A-Za-z0-9._-]{4,50}\\s*",
                message = "Dài 4 đến 50 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang")
        String username,

        @NotBlank(message = "Không được để trống")
        @Size(max = 64, message = "Tối đa 64 ký tự")
        String password,

        @NotNull(message = "Không được để trống")
        UUID applicationId,

        @NotBlank(message = "Không được để trống")
        @Size(max = 64, message = "Tối đa 64 ký tự")
        String accessCode) {
}
