package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Khách hàng đã có tài khoản đăng nhập: mỗi khách chỉ có một tài khoản. */
public class CustomerAlreadyHasLoginException extends DomainException {

    public static final String CODE = "AUTH_CUSTOMER_HAS_LOGIN";

    public CustomerAlreadyHasLoginException() {
        super(ErrorType.CONFLICT, CODE, "Khách hàng này đã có tài khoản đăng nhập.");
    }
}
