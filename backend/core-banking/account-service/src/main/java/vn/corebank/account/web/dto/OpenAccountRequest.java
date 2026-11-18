package vn.corebank.account.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Dữ liệu nhân viên gửi lên khi mở tài khoản cho một người dùng. */
public record OpenAccountRequest(

        /* Mã người dùng Keycloak của chủ tài khoản. */
        @NotBlank(message = "Không được để trống")
        @Size(max = 64, message = "Tối đa 64 ký tự")
        String ownerId,

        /* Loại sản phẩm, ví dụ CASA_VND. */
        @NotBlank(message = "Không được để trống")
        @Pattern(regexp = "[A-Z0-9_]{1,30}", message = "Chỉ gồm chữ in hoa, chữ số và dấu gạch dưới, tối đa 30 ký tự")
        String productCode) {
}
