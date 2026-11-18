package vn.corebank.customer.application;

import vn.corebank.customer.domain.model.OnboardingApplication;

/**
 * Trạng thái hồ sơ khách xem được.
 *
 * @param cifNumber số CIF khi hồ sơ đã được duyệt, null nếu chưa
 */
public record ApplicantView(OnboardingApplication application, String cifNumber) {
}
