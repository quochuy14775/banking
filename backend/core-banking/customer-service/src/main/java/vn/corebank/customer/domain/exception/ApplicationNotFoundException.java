package vn.corebank.customer.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Không tìm thấy hồ sơ đăng ký, hoặc mã tra cứu không đúng (hai trường hợp trả cùng một lỗi để không lộ hồ sơ nào tồn tại). */
public class ApplicationNotFoundException extends DomainException {

    public static final String CODE = "CUSTOMER_APPLICATION_NOT_FOUND";

    public ApplicationNotFoundException() {
        super(ErrorType.NOT_FOUND, CODE, "Không tìm thấy hồ sơ đăng ký.");
    }
}
