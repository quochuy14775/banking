package vn.corebank.customer.web.dto;

import vn.corebank.customer.application.ApplicantView;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.OnboardingApplication;

import java.time.Instant;
import java.util.UUID;

/** Trạng thái hồ sơ cho khách: lý do khi bị từ chối, số CIF khi đã duyệt. Không chứa ảnh hay số CCCD. */
public record ApplicationStatusResponse(UUID applicationId, ApplicationStatus status, String rejectReason,
                                        String cifNumber, Instant submittedAt, Instant reviewedAt) {

    public static ApplicationStatusResponse from(ApplicantView view) {
        OnboardingApplication application = view.application();
        return new ApplicationStatusResponse(application.getId(), application.getStatus(), application.getRejectReason(),
                view.cifNumber(), application.getCreatedAt(), application.getReviewedAt());
    }
}
