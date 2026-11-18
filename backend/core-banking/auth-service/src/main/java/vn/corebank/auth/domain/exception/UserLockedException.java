package vn.corebank.auth.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Tài khoản đăng nhập đang bị khóa tạm vì nhập sai mật khẩu nhiều lần. */
public class UserLockedException extends DomainException {

    public static final String CODE = "AUTH_USER_LOCKED";

    public UserLockedException() {
        super(ErrorType.FORBIDDEN, CODE,
                "Tài khoản đăng nhập tạm bị khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau.");
    }
}
