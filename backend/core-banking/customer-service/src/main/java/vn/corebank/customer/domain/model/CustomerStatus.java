package vn.corebank.customer.domain.model;

/** Trạng thái của hồ sơ khách hàng (CIF). Khách chỉ được tạo khi nhân viên duyệt hồ sơ đăng ký nên không có bước chờ. */
public enum CustomerStatus {

    /** Hoạt động bình thường. */
    ACTIVE,

    /** Bị chặn vì lý do nghiệp vụ (ví dụ nghi gian lận). */
    BLOCKED
}
