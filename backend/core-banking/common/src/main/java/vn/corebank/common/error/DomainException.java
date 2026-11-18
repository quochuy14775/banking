package vn.corebank.common.error;

import lombok.Getter;

/**
 * Lớp cha của mọi lỗi nghiệp vụ trong mọi service.
 *
 * <p>{@code code} là mã lỗi cố định mà API trả về cho app, ví dụ {@code ACCOUNT_NOT_FOUND}.
 * App dựa vào mã này để xử lý, không dựa vào câu chữ của thông báo (câu chữ có thể đổi).
 * {@code type} quyết định mã HTTP, xem {@link ErrorType}.
 */
@Getter
public abstract class DomainException extends RuntimeException {

    private final ErrorType type;
    private final String code;

    protected DomainException(ErrorType type, String code, String message) {
        super(message);
        this.type = type;
        this.code = code;
    }
}
