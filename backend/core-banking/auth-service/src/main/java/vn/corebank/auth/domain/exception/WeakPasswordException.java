package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Mật khẩu không đạt PasswordPolicy. */
public class WeakPasswordException extends DomainException {

    public static final String CODE = "AUTH_WEAK_PASSWORD";

    public WeakPasswordException(String message) {
        super(ErrorType.INVALID_INPUT, CODE, message);
    }
}
