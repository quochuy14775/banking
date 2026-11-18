package vn.corebank.customer.application;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.corebank.customer.domain.exception.ApplicationNotFoundException;
import vn.corebank.customer.domain.exception.NationalIdTakenException;
import vn.corebank.customer.domain.model.ApplicationDocument;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.Customer;
import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.domain.model.OnboardingApplication;
import vn.corebank.customer.domain.port.CifNumberGenerator;
import vn.corebank.customer.domain.repository.ApplicationDocumentRepository;
import vn.corebank.customer.domain.repository.CustomerRepository;
import vn.corebank.customer.domain.repository.OnboardingApplicationRepository;
import vn.corebank.customer.domain.rule.CustomerRules;
import vn.corebank.customer.domain.rule.OnboardingRules;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Phía nhân viên của luồng đăng ký (cần vai trò ADMIN): xem hồ sơ chờ duyệt, xem ảnh, duyệt hoặc từ chối.
 * Duyệt thì tạo khách hàng (CIF) ngay trong cùng transaction; hai nhân viên xử lý cùng một hồ sơ cùng lúc thì người sau
 * bị khóa lạc quan ({@code @Version}) từ chối.
 */
@Service
@RequiredArgsConstructor
public class ApplicationReviewService {

    private static final int MAX_PAGE_SIZE = 50;

    private final OnboardingApplicationRepository applicationRepository;
    private final ApplicationDocumentRepository documentRepository;
    private final CustomerRepository customerRepository;
    private final CifNumberGenerator cifNumberGenerator;
    private final Clock clock;

    @Transactional(readOnly = true)
    public Page<OnboardingApplication> list(ApplicationStatus status, int page, int size) {
        PageRequest request = PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
        return applicationRepository.findByStatusOrderByCreatedAtAsc(status, request);
    }

    /** Chi tiết hồ sơ, kèm cờ "số CCCD này đã có khách hàng" để nhân viên biết trước khi duyệt. */
    @Transactional(readOnly = true)
    public ReviewView get(UUID applicationId) {
        OnboardingApplication application = require(applicationId);
        boolean nationalIdTaken = application.getStatus() == ApplicationStatus.PENDING_REVIEW
                && customerRepository.existsByNationalId(application.getNationalId());
        return new ReviewView(application, nationalIdTaken);
    }

    @Transactional(readOnly = true)
    public ApplicationDocument document(UUID applicationId, DocumentType type) {
        return documentRepository.findByApplicationIdAndType(applicationId, type)
                .orElseThrow(ApplicationNotFoundException::new);
    }

    /**
     * Duyệt: tạo khách hàng ACTIVE với số CIF mới rồi gắn vào hồ sơ. Số CCCD đã có khách thì báo trùng (409) và không tạo;
     * nhân viên nên từ chối hồ sơ đó kèm lý do.
     */
    @Transactional
    public ApprovalResult approve(UUID applicationId, UUID reviewerId) {
        OnboardingApplication application = require(applicationId);
        OnboardingRules.ensurePending(application);
        if (customerRepository.existsByNationalId(application.getNationalId())) {
            throw new NationalIdTakenException();
        }
        LocalDate today = LocalDate.now(clock.withZone(OnboardingService.VIETNAM));
        Customer customer = CustomerRules.register(cifNumberGenerator.next(), OnboardingRules.identityOf(application),
                today);
        try {
            // flush ngay để nếu hai hồ sơ cùng số CCCD được duyệt cùng lúc, hồ sơ sau gặp lỗi trùng ở đây
            // (ràng buộc UNIQUE) và nhận lỗi rõ ràng thay vì lỗi 500.
            customerRepository.saveAndFlush(customer);
        } catch (DataIntegrityViolationException e) {
            throw new NationalIdTakenException();
        }
        OnboardingRules.approve(application, customer.getId(), reviewerId, now());
        return new ApprovalResult(application, customer);
    }

    @Transactional
    public OnboardingApplication reject(UUID applicationId, UUID reviewerId, String reason) {
        OnboardingApplication application = require(applicationId);
        OnboardingRules.reject(application, reason, reviewerId, now());
        return application;
    }

    private OnboardingApplication require(UUID applicationId) {
        return applicationRepository.findById(applicationId).orElseThrow(ApplicationNotFoundException::new);
    }

    /** Cắt về micro giây vì PostgreSQL chỉ lưu tới đó. */
    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }
}
