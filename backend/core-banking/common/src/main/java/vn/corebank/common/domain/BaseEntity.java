package vn.corebank.common.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Version;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/**
 * Lớp cha của mọi entity: id dạng UUID, khóa lạc quan, thời điểm tạo và sửa.
 * Bảng của entity con phải có các cột {@code id}, {@code version}, {@code created_at}, {@code updated_at}.
 *
 * <p>Id được gán ngay khi tạo object (không chờ database sinh), nên entity có id ngay từ đầu,
 * so sánh được và gửi đi trong sự kiện trước khi lưu.
 */
@MappedSuperclass
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // chỉ dành cho JPA
public abstract class BaseEntity {

    @Id
    private UUID id;

    /**
     * Khóa lạc quan: hai request cùng sửa một bản ghi thì request sau bị từ chối thay vì ghi đè.
     * Dùng {@code Long} (không phải {@code long}) để bản ghi mới có giá trị null, nhờ đó Spring Data
     * nhận ra đây là bản ghi mới và chèn thẳng thay vì đi tìm trước.
     */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Entity con gọi khi tạo bản ghi mới, thường truyền {@code UUID.randomUUID()}. */
    protected BaseEntity(UUID id) {
        this.id = Objects.requireNonNull(id, "id");
    }

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    // So sánh theo id: id gán lúc tạo và không bao giờ đổi. UUID không trùng giữa các bảng nên không cần so loại entity.
    // Dùng getId() cho đối tượng kia vì Hibernate có thể đưa vào một proxy chưa nạp dữ liệu.
    @Override
    public boolean equals(Object o) {
        return this == o || (o instanceof BaseEntity other && id != null && id.equals(other.getId()));
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
