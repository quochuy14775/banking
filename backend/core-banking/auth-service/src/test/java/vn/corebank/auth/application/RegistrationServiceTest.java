package vn.corebank.auth.application;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import vn.corebank.auth.domain.exception.CustomerAlreadyHasLoginException;
import vn.corebank.auth.domain.exception.OnboardingNotApprovedException;
import vn.corebank.auth.domain.exception.UsernameTakenException;
import vn.corebank.auth.domain.exception.WeakPasswordException;
import vn.corebank.auth.domain.model.UserAccount;
import vn.corebank.auth.domain.model.UserRole;
import vn.corebank.auth.domain.port.CustomerDirectory;
import vn.corebank.auth.domain.repository.UserAccountRepository;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

// Test tầng application với repository và customer-service giả (mock): không cần database hay service khác.
class RegistrationServiceTest {

    private static final UUID APPLICATION_ID = UUID.randomUUID();
    private static final UUID CUSTOMER_ID = UUID.randomUUID();

    private final UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
    private final CustomerDirectory customerDirectory = mock(CustomerDirectory.class);
    // Độ khó BCrypt thấp (4) để test chạy nhanh.
    private final RegistrationService service = new RegistrationService(userAccountRepository,
            new BCryptPasswordEncoder(4), customerDirectory);

    @Test
    void registersCustomerLinkedToApprovedApplication() {
        given(customerDirectory.verifyApprovedApplicant(APPLICATION_ID, "ma")).willReturn(CUSTOMER_ID);
        given(userAccountRepository.saveAndFlush(any(UserAccount.class))).willAnswer(call -> call.getArgument(0));

        UserAccount user = service.register(" An.Nguyen ", "matkhau123", APPLICATION_ID, "ma");

        assertThat(user.getUsername()).isEqualTo("an.nguyen");
        assertThat(user.getRole()).isEqualTo(UserRole.CUSTOMER);
        assertThat(user.getCustomerId()).isEqualTo(CUSTOMER_ID);
        assertThat(user.getPasswordHash()).doesNotContain("matkhau123");
    }

    /** Mật khẩu yếu hay tên trùng thì báo ngay, không gọi customer-service. */
    @Test
    void checksPasswordAndUsernameBeforeCallingCustomerService() {
        given(userAccountRepository.existsByUsername("an.nguyen")).willReturn(true);

        assertThatExceptionOfType(WeakPasswordException.class)
                .isThrownBy(() -> service.register("binh.tran", "123", APPLICATION_ID, "ma"));
        assertThatExceptionOfType(UsernameTakenException.class)
                .isThrownBy(() -> service.register("an.nguyen", "matkhau123", APPLICATION_ID, "ma"));
        verifyNoInteractions(customerDirectory);
    }

    @Test
    void rejectsApplicationNotYetApproved() {
        given(customerDirectory.verifyApprovedApplicant(APPLICATION_ID, "ma"))
                .willThrow(new OnboardingNotApprovedException());

        assertThatExceptionOfType(OnboardingNotApprovedException.class)
                .isThrownBy(() -> service.register("an.nguyen", "matkhau123", APPLICATION_ID, "ma"));
        verify(userAccountRepository, never()).saveAndFlush(any());
    }

    @Test
    void customerCanHaveOnlyOneLogin() {
        given(customerDirectory.verifyApprovedApplicant(APPLICATION_ID, "ma")).willReturn(CUSTOMER_ID);
        given(userAccountRepository.existsByCustomerId(CUSTOMER_ID)).willReturn(true);

        assertThatExceptionOfType(CustomerAlreadyHasLoginException.class)
                .isThrownBy(() -> service.register("an.nguyen", "matkhau123", APPLICATION_ID, "ma"));
        verify(userAccountRepository, never()).saveAndFlush(any());
    }

    /** Hai request cùng khách đến cùng lúc: request sau gặp ràng buộc UNIQUE và nhận lỗi rõ ràng. */
    @Test
    void concurrentRegistrationForSameCustomerIsConflict() {
        given(customerDirectory.verifyApprovedApplicant(APPLICATION_ID, "ma")).willReturn(CUSTOMER_ID);
        given(userAccountRepository.existsByCustomerId(CUSTOMER_ID)).willReturn(false, true);
        given(userAccountRepository.saveAndFlush(any(UserAccount.class)))
                .willThrow(new DataIntegrityViolationException("uq_user_account_customer"));

        assertThatExceptionOfType(CustomerAlreadyHasLoginException.class)
                .isThrownBy(() -> service.register("an.nguyen", "matkhau123", APPLICATION_ID, "ma"));
    }
}
