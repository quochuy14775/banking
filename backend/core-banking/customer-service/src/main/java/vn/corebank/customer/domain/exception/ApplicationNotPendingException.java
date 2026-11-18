package vn.corebank.customer.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Hồ sơ đăng ký không còn chờ duyệt (đã duyệt hoặc đã từ chối). */
public class ApplicationNotPendingException extends DomainException {

    public static final String CODE = "CUSTOMER_APPLICATION_NOT_PENDING";

    public ApplicationNotPendingException() {
        super(ErrorType.CONFLICT, CODE, "Hồ sơ đăng ký đã được xử lý.");
    }
}
