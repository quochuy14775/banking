package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Tên đăng nhập đã có người dùng. */
public class UsernameTakenException extends DomainException {

    public static final String CODE = "AUTH_USERNAME_TAKEN";

    public UsernameTakenException() {
        super(ErrorType.CONFLICT, CODE, "Tên đăng nhập đã được sử dụng.");
    }
}
