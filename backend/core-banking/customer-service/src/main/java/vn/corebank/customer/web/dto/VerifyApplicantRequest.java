package vn.corebank.customer.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** auth-service gửi mã tra cứu khách nhập, để kiểm tra trước khi tạo tài khoản đăng nhập. */
public record VerifyApplicantRequest(

        @NotBlank(message = "Không được để trống")
        @Size(max = 64, message = "Tối đa 64 ký tự")
        String accessCode) {
}
