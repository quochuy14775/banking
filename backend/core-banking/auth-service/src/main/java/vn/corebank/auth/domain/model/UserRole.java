package vn.corebank.auth.domain.model;

/** Vai trò của người đăng nhập. Ghi vào claim {@code roles} trong token để các service khác phân quyền. */
public enum UserRole {

    /** Khách hàng dùng app. */
    CUSTOMER,

    /** Nhân viên ngân hàng, dùng các API quản trị (ví dụ mở tài khoản cho khách). */
    ADMIN
}
