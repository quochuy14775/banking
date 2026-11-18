package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Hồ sơ đăng ký chưa được nhân viên duyệt nên chưa tạo được tài khoản đăng nhập. */
public class OnboardingNotApprovedException extends DomainException {

    public static final String CODE = "AUTH_ONBOARDING_NOT_APPROVED";

    public OnboardingNotApprovedException() {
        super(ErrorType.CONFLICT, CODE, "Hồ sơ đăng ký chưa được duyệt.");
    }
}
