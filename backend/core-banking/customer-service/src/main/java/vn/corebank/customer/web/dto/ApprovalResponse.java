package vn.corebank.customer.web.dto;

import vn.corebank.customer.application.ApprovalResult;
import vn.corebank.customer.domain.model.ApplicationStatus;

import java.util.UUID;

/** Kết quả duyệt: khách hàng vừa tạo. */
public record ApprovalResponse(UUID applicationId, ApplicationStatus status, UUID customerId, String cifNumber) {

    public static ApprovalResponse from(ApprovalResult result) {
        return new ApprovalResponse(result.application().getId(), result.application().getStatus(),
                result.customer().getId(), result.customer().getCifNumber());
    }
}
