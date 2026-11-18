package vn.corebank.customer;

import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.domain.model.Gender;
import vn.corebank.customer.domain.model.IdentityData;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;

/** Dữ liệu dựng sẵn cho test. */
public final class TestData {

    public static final LocalDate TODAY = LocalDate.of(2026, 11, 17);

    /** Đầu file JPEG và PNG: đủ để server nhận ra định dạng ảnh. */
    public static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};
    public static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0x0D};

    private TestData() {
    }

    /** Nam sinh 1995: số thứ 4 là 0 (nam, 1900–1999), số 5–6 là 95. */
    public static IdentityData identity() {
        return new IdentityData("001095012345", "025123456", "Nguyễn Văn An", LocalDate.of(1995, 5, 20), Gender.MALE,
                "12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh", LocalDate.of(2021, 8, 20), "0912345678", null);
    }

    public static Map<DocumentType, byte[]> documents() {
        Map<DocumentType, byte[]> documents = new EnumMap<>(DocumentType.class);
        documents.put(DocumentType.ID_FRONT, JPEG);
        documents.put(DocumentType.ID_BACK, JPEG);
        documents.put(DocumentType.PORTRAIT, PNG);
        return documents;
    }
}
