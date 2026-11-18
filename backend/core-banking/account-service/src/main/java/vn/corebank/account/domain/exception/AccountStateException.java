package vn.corebank.account.domain.exception;

import vn.corebank.common.error.DomainException;
import vn.corebank.common.error.ErrorType;

/** Thao tác không hợp lệ với trạng thái hiện tại của tài khoản, ví dụ đóng một tài khoản đang bị phong tỏa. */
public class AccountStateException extends DomainException {

    public static final String CODE = "ACCOUNT_INVALID_STATE";

    public AccountStateException(String message) {
        super(ErrorType.CONFLICT, CODE, message);
    }
}
