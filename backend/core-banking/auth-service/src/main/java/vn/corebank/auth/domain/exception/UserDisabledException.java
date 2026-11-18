package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Tài khoản đăng nhập đã bị vô hiệu hóa. */
public class UserDisabledException extends DomainException {

    public static final String CODE = "AUTH_USER_DISABLED";

    public UserDisabledException() {
        super(ErrorType.FORBIDDEN, CODE, "Tài khoản đăng nhập đã bị vô hiệu hóa. Vui lòng liên hệ ngân hàng.");
    }
}
