package vn.corebank.customer.web.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import vn.corebank.customer.application.SubmitApplicationCommand;
import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.domain.model.Gender;
import vn.corebank.customer.domain.model.IdentityData;

import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;

/**
 * Khách gửi hồ sơ đăng ký: thông tin app đọc từ mã QR trên CCCD, liên hệ, đồng ý và 3 ảnh (base64, JSON tự đổi sang byte[]).
 * Kiểm tra chi tiết (đủ tuổi, số CCCD khớp ngày sinh, ảnh JPEG/PNG...) do tầng domain làm; ở đây chặn dữ liệu thiếu
 * hoặc quá lớn.
 */
public record SubmitApplicationRequest(

        @NotBlank(message = "Không được để trống")
        @Size(max = 12, message = "Số CCCD gồm 12 chữ số")
        String nationalId,

        @Size(max = 9, message = "Số CMND cũ gồm 9 chữ số")
        String oldIdNumber,

        @NotBlank(message = "Không được để trống")
        @Size(max = 150, message = "Tối đa 150 ký tự")
        String fullName,

        @NotNull(message = "Không được để trống")
        LocalDate dateOfBirth,

        @NotNull(message = "Không được để trống")
        Gender gender,

        @NotBlank(message = "Không được để trống")
        @Size(max = 300, message = "Tối đa 300 ký tự")
        String address,

        LocalDate idIssueDate,

        /** Chỉ là thông tin liên hệ, không dùng để xác thực. */
        @Size(max = 20, message = "Tối đa 20 ký tự")
        String phone,

        @Size(max = 100, message = "Tối đa 100 ký tự")
        String email,

        /** Phiên bản văn bản đồng ý xử lý dữ liệu cá nhân mà khách đã đọc. */
        @NotBlank(message = "Không được để trống")
        @Size(max = 20, message = "Tối đa 20 ký tự")
        String consentVersion,

        @AssertTrue(message = "Khách phải đồng ý xử lý dữ liệu cá nhân")
        boolean consent,

        @NotNull(message = "Không được để trống")
        @Size(min = 1, max = 2_097_152, message = "Ảnh tối đa 2 MB")
        byte[] idFrontImage,

        @NotNull(message = "Không được để trống")
        @Size(min = 1, max = 2_097_152, message = "Ảnh tối đa 2 MB")
        byte[] idBackImage,

        @NotNull(message = "Không được để trống")
        @Size(min = 1, max = 2_097_152, message = "Ảnh tối đa 2 MB")
        byte[] portraitImage) {

    public SubmitApplicationCommand toCommand() {
        IdentityData identity = new IdentityData(nationalId, oldIdNumber, fullName, dateOfBirth, gender, address,
                idIssueDate, phone, email);
        Map<DocumentType, byte[]> documents = new EnumMap<>(DocumentType.class);
        documents.put(DocumentType.ID_FRONT, idFrontImage);
        documents.put(DocumentType.ID_BACK, idBackImage);
        documents.put(DocumentType.PORTRAIT, portraitImage);
        return new SubmitApplicationCommand(identity, documents, consentVersion);
    }
}
