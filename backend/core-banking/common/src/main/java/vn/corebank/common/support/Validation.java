package vn.corebank.common.support;

import java.util.regex.Pattern;

/**
 * Kiểm tra dữ liệu đầu vào dùng chung cho mọi service.
 * Dữ liệu sai thì ném {@link IllegalArgumentException}; GlobalExceptionHandler đổi thành HTTP 400.
 */
public final class Validation {

    private Validation() {
    }

    /** Không được null hoặc toàn khoảng trắng. */
    public static String requireText(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " không được để trống");
        }
        return value;
    }

    /** Phải khớp đúng mẫu {@code pattern} (cả chuỗi). */
    public static String requireMatch(String value, Pattern pattern, String field) {
        if (value == null || !pattern.matcher(value).matches()) {
            throw new IllegalArgumentException(field + " không hợp lệ: " + value);
        }
        return value;
    }
}
