package vn.corebank.customer.application;

import org.junit.jupiter.api.Test;
import vn.corebank.customer.TestData;
import vn.corebank.customer.domain.exception.ApplicationNotApprovedException;
import vn.corebank.customer.domain.exception.ApplicationNotFoundException;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.OnboardingApplication;
import vn.corebank.customer.domain.repository.ApplicationDocumentRepository;
import vn.corebank.customer.domain.repository.BiometricConsentRepository;
import vn.corebank.customer.domain.repository.CustomerRepository;
import vn.corebank.customer.domain.repository.OnboardingApplicationRepository;
import vn.corebank.customer.domain.support.AccessCodes;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

class OnboardingServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-17T03:00:00Z"), ZoneOffset.UTC);

    private final OnboardingApplicationRepository applicationRepository = mock(OnboardingApplicationRepository.class);
    private final OnboardingService service = new OnboardingService(applicationRepository,
            mock(ApplicationDocumentRepository.class), mock(BiometricConsentRepository.class),
            mock(CustomerRepository.class), CLOCK);

    @Test
    void submitReturnsAccessCodeButStoresOnlyItsHash() {
        given(applicationRepository.save(any(OnboardingApplication.class))).willAnswer(call -> call.getArgument(0));

        SubmittedApplication submitted = service.submit(
                new SubmitApplicationCommand(TestData.identity(), TestData.documents(), "2026-01"));

        assertThat(submitted.application().getStatus()).isEqualTo(ApplicationStatus.PENDING_REVIEW);
        assertThat(submitted.application().getAccessCodeHash()).isEqualTo(AccessCodes.hash(submitted.accessCode()));
        assertThat(submitted.application().getAccessCodeHash()).isNotEqualTo(submitted.accessCode());
    }

    @Test
    void wrongAccessCodeLooksLikeMissingApplication() {
        OnboardingApplication application = pendingWithCode("dung-ma");

        assertThatExceptionOfType(ApplicationNotFoundException.class)
                .isThrownBy(() -> service.findForApplicant(application.getId(), "sai-ma"));
        assertThatExceptionOfType(ApplicationNotFoundException.class)
                .isThrownBy(() -> service.findForApplicant(UUID.randomUUID(), "dung-ma"));
        assertThat(service.findForApplicant(application.getId(), "dung-ma").cifNumber()).isNull();
    }

    @Test
    void cannotCreateLoginBeforeApproval() {
        OnboardingApplication application = pendingWithCode("dung-ma");

        assertThatExceptionOfType(ApplicationNotApprovedException.class)
                .isThrownBy(() -> service.verifyApprovedApplicant(application.getId(), "dung-ma"));
    }

    private OnboardingApplication pendingWithCode(String code) {
        OnboardingApplication application = vn.corebank.customer.domain.rule.OnboardingRules.submit(
                vn.corebank.customer.domain.rule.CustomerRules.validated(TestData.identity(), TestData.TODAY),
                AccessCodes.hash(code));
        given(applicationRepository.findById(application.getId())).willReturn(Optional.of(application));
        return application;
    }
}
