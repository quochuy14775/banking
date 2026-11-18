package vn.corebank.auth.domain.support;

import java.util.Locale;
import java.util.regex.Pattern;

/** Chuẩn hóa và kiểm tra tên đăng nhập. */
public final class Usernames {

    /** Chữ thường, chữ số, dấu chấm, gạch dưới, gạch ngang; dài 4 đến 50 ký tự. */
    private static final Pattern VALID = Pattern.compile("[a-z0-9._-]{4,50}");

    private Usernames() {
    }

    /**
     * Chuẩn hóa trước khi lưu hoặc tìm: bỏ khoảng trắng hai đầu, đổi sang chữ thường.
     * Nhờ vậy "An.Nguyen" và "an.nguyen" là cùng một người.
     */
    public static String normalize(String username) {
        return username == null ? "" : username.trim().toLowerCase(Locale.ROOT);
    }

    /** Tên đã chuẩn hóa có đúng định dạng không. */
    public static boolean isValid(String normalizedUsername) {
        return VALID.matcher(normalizedUsername).matches();
    }
}
