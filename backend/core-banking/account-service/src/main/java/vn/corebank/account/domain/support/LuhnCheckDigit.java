package vn.corebank.account.domain.support;

/**
 * Chữ số kiểm tra theo thuật toán Luhn (cùng thuật toán dùng cho số thẻ ngân hàng).
 * Gõ nhầm một chữ số, hoặc đảo chỗ hai chữ số liền nhau, thì số tài khoản không còn hợp lệ,
 * nên app phát hiện được lỗi gõ trước khi gửi lệnh chuyển tiền.
 */
public final class LuhnCheckDigit {

    private LuhnCheckDigit() {
    }

    /** Chữ số kiểm tra cần thêm vào cuối {@code digits}. */
    public static int compute(String digits) {
        requireDigits(digits);
        int sum = 0;
        // Tính từ phải sang trái; vì chữ số kiểm tra sẽ đứng cuối nên chữ số cuối của digits được nhân đôi.
        for (int i = 0; i < digits.length(); i++) {
            int digit = digits.charAt(digits.length() - 1 - i) - '0';
            if (i % 2 == 0) {
                digit *= 2;
                if (digit > 9) {
                    digit -= 9;
                }
            }
            sum += digit;
        }
        return (10 - sum % 10) % 10;
    }

    /** {@code number} có chữ số cuối đúng là chữ số kiểm tra của phần đứng trước không. */
    public static boolean isValid(String number) {
        if (number == null || number.length() < 2 || !number.chars().allMatch(Character::isDigit)) {
            return false;
        }
        int last = number.length() - 1;
        return compute(number.substring(0, last)) == number.charAt(last) - '0';
    }

    private static void requireDigits(String digits) {
        if (digits == null || digits.isEmpty() || !digits.chars().allMatch(Character::isDigit)) {
            throw new IllegalArgumentException("Chỉ được gồm chữ số: " + digits);
        }
    }
}
