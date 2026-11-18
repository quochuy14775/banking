package vn.corebank.customer.application;

import vn.corebank.customer.domain.model.OnboardingApplication;

/**
 * Hồ sơ nhân viên đang xem.
 *
 * @param nationalIdTaken true nếu hồ sơ còn chờ duyệt mà số CCCD đã có khách hàng (duyệt sẽ bị báo trùng)
 */
public record ReviewView(OnboardingApplication application, boolean nationalIdTaken) {
}
