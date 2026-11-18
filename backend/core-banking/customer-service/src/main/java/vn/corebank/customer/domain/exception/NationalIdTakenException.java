package vn.corebank.customer.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Số CCCD đã có khách hàng: không duyệt thêm hồ sơ nào cho số CCCD này. */
public class NationalIdTakenException extends DomainException {

    public static final String CODE = "CUSTOMER_NATIONAL_ID_TAKEN";

    public NationalIdTakenException() {
        super(ErrorType.CONFLICT, CODE, "Số CCCD này đã có hồ sơ khách hàng.");
    }
}
