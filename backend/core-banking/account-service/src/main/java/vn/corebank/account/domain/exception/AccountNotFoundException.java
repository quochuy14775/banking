package vn.corebank.account.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/**
 * Không tìm thấy tài khoản, hoặc tài khoản thuộc về người khác.
 * Hai trường hợp dùng chung một lỗi để người dùng không đoán được tài khoản của người khác có tồn tại hay không.
 */
public class AccountNotFoundException extends DomainException {

    public static final String CODE = "ACCOUNT_NOT_FOUND";

    public AccountNotFoundException() {
        super(ErrorType.NOT_FOUND, CODE, "Không tìm thấy tài khoản.");
    }
}
