package vn.corebank.customer.web.dto;

import vn.corebank.customer.application.SubmittedApplication;
import vn.corebank.customer.domain.model.ApplicationStatus;

import java.util.UUID;

/**
 * Hồ sơ vừa gửi. {@code accessCode} chỉ trả đúng lần này: app phải lưu an toàn (expo-secure-store) để xem trạng thái
 * và tạo tài khoản đăng nhập sau khi được duyệt.
 */
public record SubmitApplicationResponse(UUID applicationId, String accessCode, ApplicationStatus status) {

    public static SubmitApplicationResponse from(SubmittedApplication submitted) {
        return new SubmitApplicationResponse(submitted.application().getId(), submitted.accessCode(),
                submitted.application().getStatus());
    }
}
