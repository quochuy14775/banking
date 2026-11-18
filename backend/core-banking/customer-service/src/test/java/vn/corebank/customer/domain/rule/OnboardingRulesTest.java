package vn.corebank.customer.domain.rule;

import org.junit.jupiter.api.Test;
import vn.corebank.customer.TestData;
import vn.corebank.customer.domain.exception.ApplicationNotPendingException;
import vn.corebank.customer.domain.model.ApplicationDocument;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.domain.model.OnboardingApplication;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

class OnboardingRulesTest {

    private static final Instant NOW = Instant.parse("2026-11-17T03:00:00Z");
    private static final UUID REVIEWER = UUID.randomUUID();

    private static OnboardingApplication pending() {
        return OnboardingRules.submit(CustomerRules.validated(TestData.identity(), TestData.TODAY), "hash");
    }

    @Test
    void submitCreatesPendingApplication() {
        OnboardingApplication application = pending();

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.PENDING_REVIEW);
        assertThat(application.getNationalId()).isEqualTo("001095012345");
        assertThat(application.getReviewedAt()).isNull();
    }

    @Test
    void attachDocumentsDetectsContentTypeFromBytes() {
        UUID id = UUID.randomUUID();

        List<ApplicationDocument> documents = OnboardingRules.attachDocuments(id, TestData.documents());

        assertThat(documents).hasSize(3).allSatisfy(document -> assertThat(document.getApplicationId()).isEqualTo(id));
        assertThat(documents).filteredOn(d -> d.getType() == DocumentType.PORTRAIT)
                .singleElement().satisfies(d -> assertThat(d.getContentType()).isEqualTo("image/png"));
        assertThat(documents).filteredOn(d -> d.getType() == DocumentType.ID_FRONT)
                .singleElement().satisfies(d -> assertThat(d.getContentType()).isEqualTo("image/jpeg"));
    }

    @Test
    void attachDocumentsRejectsMissingNonImageOrTooLarge() {
        UUID id = UUID.randomUUID();
        Map<DocumentType, byte[]> missing = TestData.documents();
        missing.remove(DocumentType.ID_BACK);
        Map<DocumentType, byte[]> notImage = TestData.documents();
        notImage.put(DocumentType.ID_BACK, "<html>".getBytes());
        Map<DocumentType, byte[]> tooLarge = TestData.documents();
        byte[] big = new byte[OnboardingRules.MAX_DOCUMENT_BYTES + 1];
        System.arraycopy(TestData.JPEG, 0, big, 0, TestData.JPEG.length);
        tooLarge.put(DocumentType.PORTRAIT, big);

        assertThatIllegalArgumentException().isThrownBy(() -> OnboardingRules.attachDocuments(id, missing));
        assertThatIllegalArgumentException().isThrownBy(() -> OnboardingRules.attachDocuments(id, notImage));
        assertThatIllegalArgumentException().isThrownBy(() -> OnboardingRules.attachDocuments(id, tooLarge));
    }

    @Test
    void approveLinksCustomerAndReviewer() {
        OnboardingApplication application = pending();
        UUID customerId = UUID.randomUUID();

        OnboardingRules.approve(application, customerId, REVIEWER, NOW);

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        assertThat(application.getCustomerId()).isEqualTo(customerId);
        assertThat(application.getReviewedBy()).isEqualTo(REVIEWER);
        assertThat(application.getReviewedAt()).isEqualTo(NOW);
    }

    @Test
    void rejectRequiresReason() {
        OnboardingApplication application = pending();

        assertThatIllegalArgumentException().isThrownBy(() -> OnboardingRules.reject(application, "  ", REVIEWER, NOW));
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.PENDING_REVIEW);

        OnboardingRules.reject(application, " Ảnh CCCD bị mờ ", REVIEWER, NOW);

        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.REJECTED);
        assertThat(application.getRejectReason()).isEqualTo("Ảnh CCCD bị mờ");
    }

    @Test
    void cannotReviewTwice() {
        OnboardingApplication application = pending();
        OnboardingRules.reject(application, "Ảnh mờ", REVIEWER, NOW);

        assertThatExceptionOfType(ApplicationNotPendingException.class)
                .isThrownBy(() -> OnboardingRules.approve(application, UUID.randomUUID(), REVIEWER, NOW));
        assertThatExceptionOfType(ApplicationNotPendingException.class)
                .isThrownBy(() -> OnboardingRules.reject(application, "Lần nữa", REVIEWER, NOW));
    }
}
