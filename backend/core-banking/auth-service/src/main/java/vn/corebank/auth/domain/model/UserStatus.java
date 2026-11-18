package vn.corebank.auth.domain.model;

/**
 * Trạng thái của tài khoản đăng nhập.
 * Việc khóa tạm do nhập sai mật khẩu không nằm ở đây mà dựa vào {@code locked_until}, vì nó tự hết hạn.
 */
public enum UserStatus {

    /** Đăng nhập bình thường. */
    ACTIVE,

    /** Bị vô hiệu hóa (ví dụ khách báo mất điện thoại): không đăng nhập được cho tới khi được mở lại. */
    DISABLED
}
