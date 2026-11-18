package vn.corebank.customer.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Hồ sơ đăng ký chưa được duyệt nên chưa tạo được tài khoản đăng nhập. */
public class ApplicationNotApprovedException extends DomainException {

    public static final String CODE = "CUSTOMER_APPLICATION_NOT_APPROVED";

    public ApplicationNotApprovedException() {
        super(ErrorType.CONFLICT, CODE, "Hồ sơ đăng ký chưa được duyệt.");
    }
}
