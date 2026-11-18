package vn.corebank.customer.application;

import vn.corebank.customer.domain.model.OnboardingApplication;

/**
 * Hồ sơ vừa gửi.
 *
 * @param accessCode mã tra cứu gốc; chỉ trả cho khách đúng lần này, database chỉ giữ bản băm
 */
public record SubmittedApplication(OnboardingApplication application, String accessCode) {
}
