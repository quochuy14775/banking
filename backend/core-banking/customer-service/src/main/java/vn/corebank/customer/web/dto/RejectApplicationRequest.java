package vn.corebank.customer.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Nhân viên từ chối hồ sơ; lý do hiện cho khách để biết cần sửa gì. */
public record RejectApplicationRequest(

        @NotBlank(message = "Không được để trống")
        @Size(max = 300, message = "Tối đa 300 ký tự")
        String reason) {
}
