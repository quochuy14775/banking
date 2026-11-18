package vn.corebank.customer.domain.rule;

import vn.corebank.common.support.Validation;
import vn.corebank.customer.domain.exception.ApplicationNotPendingException;
import vn.corebank.customer.domain.model.ApplicationDocument;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.BiometricConsent;
import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.domain.model.IdentityData;
import vn.corebank.customer.domain.model.OnboardingApplication;
import vn.corebank.customer.domain.support.DocumentImages;

import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Hàm nghiệp vụ của hồ sơ đăng ký: khách gửi hồ sơ (thông tin + 3 ảnh + đồng ý), nhân viên duyệt hoặc từ chối.
 * Có người duyệt vì thông tin lấy từ mã QR trên CCCD không có chữ ký số: nhân viên phải đối chiếu với ảnh CCCD và ảnh
 * chân dung.
 */
public final class OnboardingRules {

    /** Mỗi ảnh tối đa 2 MB (app đã thu nhỏ ảnh trước khi gửi). */
    public static final int MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
    private static final int MAX_REJECT_REASON_LENGTH = 300;

    private OnboardingRules() {
    }

    /** Tạo hồ sơ chờ duyệt từ thông tin đã qua {@code CustomerRules.validated}. */
    public static OnboardingApplication submit(IdentityData identity, String accessCodeHash) {
        OnboardingApplication application = new OnboardingApplication(UUID.randomUUID());
        application.setNationalId(identity.nationalId());
        application.setOldIdNumber(identity.oldIdNumber());
        application.setFullName(identity.fullName());
        application.setDateOfBirth(identity.dateOfBirth());
        application.setGender(identity.gender());
        application.setAddress(identity.address());
        application.setIdIssueDate(identity.idIssueDate());
        application.setPhone(identity.phone());
        application.setEmail(identity.email());
        application.setAccessCodeHash(Validation.requireText(accessCodeHash, "accessCodeHash"));
        application.setStatus(ApplicationStatus.PENDING_REVIEW);
        return application;
    }

    /**
     * Tạo ảnh kèm hồ sơ. Phải đủ cả ba loại ảnh; mỗi ảnh là JPEG hoặc PNG (nhận ra từ nội dung, không tin app khai báo)
     * và không quá {@link #MAX_DOCUMENT_BYTES}. Sai thì ném {@link IllegalArgumentException}.
     */
    public static List<ApplicationDocument> attachDocuments(UUID applicationId, Map<DocumentType, byte[]> images) {
        Objects.requireNonNull(applicationId, "applicationId");
        if (images == null || !images.keySet().containsAll(EnumSet.allOf(DocumentType.class))) {
            throw new IllegalArgumentException("Phải có đủ ảnh mặt trước, mặt sau CCCD và ảnh chân dung");
        }
        List<ApplicationDocument> documents = new ArrayList<>();
        for (DocumentType type : DocumentType.values()) {
            byte[] content = images.get(type);
            if (content == null || content.length == 0) {
                throw new IllegalArgumentException("Thiếu ảnh " + type);
            }
            if (content.length > MAX_DOCUMENT_BYTES) {
                throw new IllegalArgumentException("Ảnh " + type + " quá lớn (tối đa 2 MB)");
            }
            String contentType = DocumentImages.detectContentType(content)
                    .orElseThrow(() -> new IllegalArgumentException("Ảnh " + type + " phải là JPEG hoặc PNG"));
            ApplicationDocument document = new ApplicationDocument(UUID.randomUUID());
            document.setApplicationId(applicationId);
            document.setType(type);
            document.setContentType(contentType);
            document.setContent(content);
            documents.add(document);
        }
        return documents;
    }

    /** Ghi nhận khách đồng ý xử lý dữ liệu cá nhân (gồm ảnh) khi gửi hồ sơ. */
    public static BiometricConsent grantConsent(UUID applicationId, String consentVersion, Instant now) {
        BiometricConsent consent = new BiometricConsent(UUID.randomUUID());
        consent.setApplicationId(Objects.requireNonNull(applicationId, "applicationId"));
        consent.setConsentVersion(Validation.requireText(consentVersion, "consentVersion"));
        consent.setGrantedAt(Objects.requireNonNull(now, "now"));
        return consent;
    }

    /** Thông tin giấy tờ của hồ sơ, để tạo khách hàng khi duyệt. */
    public static IdentityData identityOf(OnboardingApplication application) {
        return new IdentityData(application.getNationalId(), application.getOldIdNumber(), application.getFullName(),
                application.getDateOfBirth(), application.getGender(), application.getAddress(),
                application.getIdIssueDate(), application.getPhone(), application.getEmail());
    }

    /** Hồ sơ phải đang chờ duyệt mới được duyệt hoặc từ chối. */
    public static void ensurePending(OnboardingApplication application) {
        if (application.getStatus() != ApplicationStatus.PENDING_REVIEW) {
            throw new ApplicationNotPendingException();
        }
    }

    /** Nhân viên duyệt: gắn khách hàng vừa tạo. */
    public static void approve(OnboardingApplication application, UUID customerId, UUID reviewerId, Instant now) {
        ensurePending(application);
        application.setStatus(ApplicationStatus.APPROVED);
        application.setCustomerId(Objects.requireNonNull(customerId, "customerId"));
        application.setReviewedBy(Objects.requireNonNull(reviewerId, "reviewerId"));
        application.setReviewedAt(Objects.requireNonNull(now, "now"));
    }

    /** Nhân viên từ chối, bắt buộc có lý do để khách biết cần sửa gì. */
    public static void reject(OnboardingApplication application, String reason, UUID reviewerId, Instant now) {
        ensurePending(application);
        String trimmed = Validation.requireText(reason == null ? null : reason.trim(), "Lý do từ chối");
        if (trimmed.length() > MAX_REJECT_REASON_LENGTH) {
            throw new IllegalArgumentException("Lý do từ chối tối đa " + MAX_REJECT_REASON_LENGTH + " ký tự");
        }
        application.setStatus(ApplicationStatus.REJECTED);
        application.setRejectReason(trimmed);
        application.setReviewedBy(Objects.requireNonNull(reviewerId, "reviewerId"));
        application.setReviewedAt(Objects.requireNonNull(now, "now"));
    }
}
