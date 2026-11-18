package vn.corebank.auth.domain.support;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Sinh và băm refresh token.
 *
 * <p>Refresh token là 32 byte ngẫu nhiên (256 bit), không thể đoán, nên băm bằng SHA-256 là đủ an toàn
 * và cho phép tìm token theo bản băm. Mật khẩu thì khác: người dùng tự đặt, dễ đoán, nên phải băm bằng BCrypt (chậm có chủ ý).
 */
public final class TokenSecrets {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;

    private TokenSecrets() {
    }

    /** Token ngẫu nhiên, dạng chữ an toàn trong URL (43 ký tự). */
    public static String generate() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Bản băm SHA-256 dạng hex (64 ký tự), là giá trị được lưu trong database. */
    public static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            // Mọi JDK đều bắt buộc có SHA-256, nên không thể xảy ra.
            throw new IllegalStateException("JDK không hỗ trợ SHA-256", e);
        }
    }
}
