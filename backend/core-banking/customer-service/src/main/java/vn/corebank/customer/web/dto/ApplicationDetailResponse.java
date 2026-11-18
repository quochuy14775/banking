package vn.corebank.customer.web.dto;

import vn.corebank.customer.application.ReviewView;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.domain.model.Gender;
import vn.corebank.customer.domain.model.OnboardingApplication;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

/**
 * Chi tiết hồ sơ cho nhân viên duyệt. Ảnh tải riêng qua {@code documentUrls} để không phải nạp ảnh cùng thông tin.
 *
 * @param nationalIdTaken true nếu số CCCD đã có khách hàng: duyệt sẽ bị báo trùng, nên từ chối kèm lý do
 */
public record ApplicationDetailResponse(UUID id, String nationalId, String oldIdNumber, String fullName,
                                        LocalDate dateOfBirth, Gender gender, String address, LocalDate idIssueDate,
                                        String phone, String email, ApplicationStatus status, String rejectReason,
                                        UUID reviewedBy, Instant reviewedAt, UUID customerId, Instant submittedAt,
                                        boolean nationalIdTaken, List<String> documentUrls) {

    public static ApplicationDetailResponse from(ReviewView view) {
        OnboardingApplication a = view.application();
        List<String> urls = Arrays.stream(DocumentType.values())
                .map(type -> "/api/admin/onboarding/applications/" + a.getId() + "/documents/" + type)
                .toList();
        return new ApplicationDetailResponse(a.getId(), a.getNationalId(), a.getOldIdNumber(), a.getFullName(),
                a.getDateOfBirth(), a.getGender(), a.getAddress(), a.getIdIssueDate(), a.getPhone(), a.getEmail(),
                a.getStatus(), a.getRejectReason(), a.getReviewedBy(), a.getReviewedAt(), a.getCustomerId(),
                a.getCreatedAt(), view.nationalIdTaken(), urls);
    }
}
