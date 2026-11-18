package vn.corebank.customer.domain.model;

/** Trạng thái hồ sơ đăng ký mở tài khoản. */
public enum ApplicationStatus {

    /** Khách vừa gửi, chờ nhân viên duyệt. */
    PENDING_REVIEW,

    /** Nhân viên đã duyệt: đã tạo khách hàng (CIF). */
    APPROVED,

    /** Nhân viên từ chối, kèm lý do. Khách sửa lại và gửi hồ sơ mới. */
    REJECTED
}
