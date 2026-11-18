package vn.corebank.customer.web.dto;

import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.OnboardingApplication;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Một dòng trong danh sách hồ sơ của nhân viên. */
public record ApplicationSummaryResponse(UUID id, String fullName, String nationalId, LocalDate dateOfBirth,
                                         ApplicationStatus status, Instant submittedAt) {

    public static ApplicationSummaryResponse from(OnboardingApplication application) {
        return new ApplicationSummaryResponse(application.getId(), application.getFullName(),
                application.getNationalId(), application.getDateOfBirth(), application.getStatus(),
                application.getCreatedAt());
    }
}
