package vn.corebank.auth.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Refresh token gửi lên khi làm mới token hoặc đăng xuất. */
public record RefreshTokenRequest(

        @NotBlank(message = "Không được để trống")
        @Size(max = 200, message = "Tối đa 200 ký tự")
        String refreshToken) {
}
