package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Refresh token không tồn tại, đã hết hạn, đã dùng hoặc đã bị thu hồi: app phải cho người dùng đăng nhập lại. */
public class InvalidRefreshTokenException extends DomainException {

    public static final String CODE = "AUTH_INVALID_REFRESH_TOKEN";

    public InvalidRefreshTokenException() {
        super(ErrorType.UNAUTHORIZED, CODE, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
}
