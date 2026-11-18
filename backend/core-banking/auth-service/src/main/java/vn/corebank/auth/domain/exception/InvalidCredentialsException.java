package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/**
 * Sai tên đăng nhập hoặc mật khẩu. Hai trường hợp dùng chung một lỗi và một câu thông báo,
 * để người ngoài không dò được tên đăng nhập nào có thật.
 */
public class InvalidCredentialsException extends DomainException {

    public static final String CODE = "AUTH_INVALID_CREDENTIALS";

    public InvalidCredentialsException() {
        super(ErrorType.UNAUTHORIZED, CODE, "Sai tên đăng nhập hoặc mật khẩu.");
    }
}
