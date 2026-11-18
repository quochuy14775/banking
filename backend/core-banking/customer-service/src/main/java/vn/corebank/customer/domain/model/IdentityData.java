package vn.corebank.customer.domain.model;

import java.time.LocalDate;

/**
 * Thông tin giấy tờ khách khai khi đăng ký (app đọc từ mã QR trên CCCD). Không lưu database, chỉ chuyển vào
 * {@code CustomerRules.validated}. Mã QR không có chữ ký số nên thông tin này phải được nhân viên đối chiếu với ảnh CCCD.
 */
public record IdentityData(
        String nationalId,
        String oldIdNumber,
        String fullName,
        LocalDate dateOfBirth,
        Gender gender,
        String address,
        LocalDate idIssueDate,
        String phone,
        String email) {
}
