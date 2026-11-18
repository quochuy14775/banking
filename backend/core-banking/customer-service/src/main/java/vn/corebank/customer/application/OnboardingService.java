package vn.corebank.customer.application;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.customer.domain.exception.ApplicationNotApprovedException;
import vn.corebank.customer.domain.exception.ApplicationNotFoundException;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.Customer;
import vn.corebank.customer.domain.model.IdentityData;
import vn.corebank.customer.domain.model.OnboardingApplication;
import vn.corebank.customer.domain.repository.ApplicationDocumentRepository;
import vn.corebank.customer.domain.repository.BiometricConsentRepository;
import vn.corebank.customer.domain.repository.CustomerRepository;
import vn.corebank.customer.domain.repository.OnboardingApplicationRepository;
import vn.corebank.customer.domain.rule.CustomerRules;
import vn.corebank.customer.domain.rule.OnboardingRules;
import vn.corebank.customer.domain.support.AccessCodes;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Phía khách của luồng đăng ký (API công khai, chưa đăng nhập): gửi hồ sơ, xem trạng thái bằng mã tra cứu.
 * Phía nhân viên nằm ở {@link ApplicationReviewService}. Quy tắc nằm ở {@link OnboardingRules} và {@link CustomerRules};
 * class này chỉ điều phối và đặt ranh giới transaction.
 */
@Service
@RequiredArgsConstructor
public class OnboardingService {

    /** Ngày sinh, ngày cấp CCCD tính theo giờ Việt Nam. */
    static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");

    private final OnboardingApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository documentRepository;
    private final BiometricConsentRepository consentRepository;
    private final CustomerRepository customerRepository;
    private final Clock clock;

    /**
     * Khách gửi hồ sơ. Trả về mã tra cứu đúng một lần (database chỉ lưu bản băm); app phải giữ mã này.
     * KHÔNG báo "CCCD đã có khách hàng" ở đây để người lạ không dò được số CCCD nào đã mở tài khoản; nhân viên thấy
     * điều đó khi duyệt.
     */
    @Transactional
    public SubmittedApplication submit(SubmitApplicationCommand command) {
        IdentityData identity = CustomerRules.validated(command.identity(), LocalDate.now(clock.withZone(VIETNAM)));
        String accessCode = AccessCodes.generate();
        OnboardingApplication application = applicationRepository.save(
                OnboardingRules.submit(identity, AccessCodes.hash(accessCode)));
        documentRepository.saveAll(OnboardingRules.attachDocuments(application.getId(), command.documents()));
        consentRepository.save(OnboardingRules.grantConsent(application.getId(), command.consentVersion(), now()));
        return new SubmittedApplication(application, accessCode);
    }

    /** Khách xem trạng thái hồ sơ. Sai mã hay không có hồ sơ đều báo không tìm thấy. */
    @Transactional(readOnly = true)
    public ApplicantView findForApplicant(UUID applicationId, String accessCode) {
        OnboardingApplication application = requireOwned(applicationId, accessCode);
        String cifNumber = application.getCustomerId() == null ? null
                : customerRepository.findById(application.getCustomerId()).map(Customer::getCifNumber).orElse(null);
        return new ApplicantView(application, cifNumber);
    }

    /**
     * Cho auth-service (qua API nội bộ) kiểm tra trước khi tạo tài khoản đăng nhập: hồ sơ phải đã được duyệt và mã tra
     * cứu đúng. Mỗi khách chỉ có một tài khoản đăng nhập do auth-service tự chặn (UNIQUE customer_id).
     */
    @Transactional(readOnly = true)
    public Customer verifyApprovedApplicant(UUID applicationId, String accessCode) {
        OnboardingApplication application = requireOwned(applicationId, accessCode);
        if (application.getStatus() != ApplicationStatus.APPROVED) {
            throw new ApplicationNotApprovedException();
        }
        return customerRepository.findById(application.getCustomerId()).orElseThrow(ApplicationNotApprovedException::new);
    }

    private OnboardingApplication requireOwned(UUID applicationId, String accessCode) {
        return applicationRepository.findById(applicationId)
                .filter(application -> AccessCodes.matches(accessCode, application.getAccessCodeHash()))
                .orElseThrow(ApplicationNotFoundException::new);
    }

    /** Cắt về micro giây vì PostgreSQL chỉ lưu tới đó; nếu không, giá trị trả về lúc ghi khác với lúc đọc lại. */
    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }
}
