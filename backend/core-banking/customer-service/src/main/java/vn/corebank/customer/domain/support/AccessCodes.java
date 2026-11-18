package vn.corebank.customer.domain.support;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Mã tra cứu hồ sơ đăng ký: chuỗi ngẫu nhiên khách giữ trên máy để xem trạng thái hồ sơ và tạo tài khoản đăng nhập sau
 * khi được duyệt. Database chỉ lưu bản băm SHA-256, nên lộ database cũng không dùng được mã.
 */
public final class AccessCodes {

    /** 18 byte ngẫu nhiên = 144 bit, thành 24 ký tự base64url. */
    private static final int RANDOM_BYTES = 18;
    private static final SecureRandom RANDOM = new SecureRandom();

    private AccessCodes() {
    }

    public static String generate() {
        byte[] bytes = new byte[RANDOM_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Bản băm SHA-256 dạng hex (64 ký tự). */
    public static String hash(String code) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    /** So mã khách gửi với bản băm đã lưu, thời gian so sánh không phụ thuộc mã đúng tới đâu. */
    public static boolean matches(String code, String expectedHash) {
        if (code == null || code.isBlank() || expectedHash == null) {
            return false;
        }
        return MessageDigest.isEqual(hash(code).getBytes(StandardCharsets.US_ASCII),
                expectedHash.getBytes(StandardCharsets.US_ASCII));
    }
}
