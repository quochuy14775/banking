package vn.corebank.auth.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Dữ liệu đăng nhập. Không kiểm tra định dạng tên đăng nhập ở đây để không lộ quy tắc khi đăng nhập sai. */
public record LoginRequest(

        @NotBlank(message = "Không được để trống")
        @Size(max = 100, message = "Tối đa 100 ký tự")
        String username,

        @NotBlank(message = "Không được để trống")
        @Size(max = 64, message = "Tối đa 64 ký tự")
        String password) {
}
