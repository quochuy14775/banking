package vn.corebank.customer.domain.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import vn.corebank.customer.domain.model.ApplicationStatus;
import vn.corebank.customer.domain.model.OnboardingApplication;

import java.util.UUID;

/** Truy cập bảng {@code onboarding_application}. */
public interface OnboardingApplicationRepository extends JpaRepository<OnboardingApplication, UUID> {

    /** Hồ sơ theo trạng thái, cũ nhất trước (nhân viên duyệt theo thứ tự gửi). */
    Page<OnboardingApplication> findByStatusOrderByCreatedAtAsc(ApplicationStatus status, Pageable pageable);
}
