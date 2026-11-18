package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Không tìm thấy hồ sơ đăng ký ở customer-service, hoặc mã tra cứu sai. */
public class OnboardingNotFoundException extends DomainException {

    public static final String CODE = "AUTH_ONBOARDING_NOT_FOUND";

    public OnboardingNotFoundException() {
        super(ErrorType.NOT_FOUND, CODE, "Mã hồ sơ hoặc mã tra cứu không đúng.");
    }
}
