package vn.corebank.customer.domain.support;

import java.util.Optional;

/**
 * Nhận ra định dạng ảnh từ các byte đầu file ("magic bytes"), không tin loại file app khai báo.
 * Chỉ nhận JPEG và PNG.
 */
public final class DocumentImages {

    public static final String JPEG = "image/jpeg";
    public static final String PNG = "image/png";

    private static final byte[] JPEG_SIGNATURE = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};

    private DocumentImages() {
    }

    /** {@code image/jpeg} hoặc {@code image/png}; rỗng nếu không phải hai định dạng này. */
    public static Optional<String> detectContentType(byte[] content) {
        if (startsWith(content, JPEG_SIGNATURE)) {
            return Optional.of(JPEG);
        }
        if (startsWith(content, PNG_SIGNATURE)) {
            return Optional.of(PNG);
        }
        return Optional.empty();
    }

    private static boolean startsWith(byte[] content, byte[] signature) {
        if (content == null || content.length < signature.length) {
            return false;
        }
        for (int i = 0; i < signature.length; i++) {
            if (content[i] != signature[i]) {
                return false;
            }
        }
        return true;
    }
}
