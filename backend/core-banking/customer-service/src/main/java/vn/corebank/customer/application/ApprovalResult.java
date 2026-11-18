package vn.corebank.customer.application;

import vn.corebank.customer.domain.model.Customer;
import vn.corebank.customer.domain.model.OnboardingApplication;

/** Kết quả duyệt hồ sơ: hồ sơ đã APPROVED và khách hàng vừa tạo. */
public record ApprovalResult(OnboardingApplication application, Customer customer) {
}
