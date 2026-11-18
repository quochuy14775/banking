package vn.corebank.customer.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import vn.corebank.common.domain.BaseEntity;

import java.util.UUID;

/**
 * Ảnh kèm hồ sơ đăng ký, ánh xạ với bảng {@code application_document}. Dữ liệu nhạy cảm: chỉ nhân viên xem, không ghi log.
 * Tách bảng riêng để danh sách hồ sơ không phải nạp ảnh.
 */
@Entity
@Table(name = "application_document")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public class ApplicationDocument extends BaseEntity {

    @Column(name = "application_id", nullable = false, updatable = false)
    private UUID applicationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, updatable = false)
    private DocumentType type;

    /** {@code image/jpeg} hoặc {@code image/png}, do server tự nhận ra từ nội dung ảnh. */
    @Column(name = "content_type", nullable = false, updatable = false)
    private String contentType;

    @Column(name = "content", nullable = false, updatable = false)
    private byte[] content;

    /** Chỉ OnboardingRules gọi, khi khách gửi hồ sơ. */
    public ApplicationDocument(UUID id) {
        super(id);
    }
}
