package vn.corebank.customer.application;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.corebank.customer.TestData;
import vn.corebank.customer.domain.exception.NationalIdTakenException;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.Customer;
import vn.corebank.customer.domain.model.OnboardingApplication;
import vn.corebank.customer.domain.port.CifNumberGenerator;
import vn.corebank.customer.domain.repository.ApplicationDocumentRepository;
import vn.corebank.customer.domain.repository.CustomerRepository;
import vn.corebank.customer.domain.repository.OnboardingApplicationRepository;
import vn.corebank.customer.domain.rule.CustomerRules;
import vn.corebank.customer.domain.rule.OnboardingRules;

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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class ApplicationReviewServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-17T03:00:00Z"), ZoneOffset.UTC);
    private static final UUID REVIEWER = UUID.randomUUID();

    private final OnboardingApplicationRepository applicationRepository = mock(OnboardingApplicationRepository.class);
    private final CustomerRepository customerRepository = mock(CustomerRepository.class);
    private final CifNumberGenerator cifNumberGenerator = () -> "0000000042";
    private final ApplicationReviewService service = new ApplicationReviewService(applicationRepository,
            mock(ApplicationDocumentRepository.class), customerRepository, cifNumberGenerator, CLOCK);

    private OnboardingApplication application;

    @BeforeEach
    void setUp() {
        application = OnboardingRules.submit(CustomerRules.validated(TestData.identity(), TestData.TODAY), "hash");
        given(applicationRepository.findById(application.getId())).willReturn(Optional.of(application));
        given(customerRepository.saveAndFlush(any(Customer.class))).willAnswer(call -> call.getArgument(0));
    }

    @Test
    void approveCreatesCustomerAndMarksApplication() {
        ApprovalResult result = service.approve(application.getId(), REVIEWER);

        assertThat(result.customer().getCifNumber()).isEqualTo("0000000042");
        assertThat(result.customer().getNationalId()).isEqualTo(application.getNationalId());
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.APPROVED);
        assertThat(application.getCustomerId()).isEqualTo(result.customer().getId());
        assertThat(application.getReviewedBy()).isEqualTo(REVIEWER);
    }

    @Test
    void approveFailsWhenNationalIdAlreadyHasCustomer() {
        given(customerRepository.existsByNationalId(application.getNationalId())).willReturn(true);

        assertThatExceptionOfType(NationalIdTakenException.class)
                .isThrownBy(() -> service.approve(application.getId(), REVIEWER));
        verify(customerRepository, never()).saveAndFlush(any());
        assertThat(application.getStatus()).isEqualTo(ApplicationStatus.PENDING_REVIEW);
    }

    @Test
    void detailFlagsTakenNationalIdForPendingApplication() {
        given(customerRepository.existsByNationalId(application.getNationalId())).willReturn(true);

        assertThat(service.get(application.getId()).nationalIdTaken()).isTrue();
    }
}
