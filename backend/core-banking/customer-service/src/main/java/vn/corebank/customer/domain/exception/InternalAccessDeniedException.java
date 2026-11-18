package vn.corebank.customer.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** API nội bộ (chỉ service khác gọi) nhận sai hoặc thiếu mã bí mật nội bộ. */
public class InternalAccessDeniedException extends DomainException {

    public static final String CODE = "CUSTOMER_INTERNAL_FORBIDDEN";

    public InternalAccessDeniedException() {
        super(ErrorType.FORBIDDEN, CODE, "Không có quyền gọi API nội bộ.");
    }
}
