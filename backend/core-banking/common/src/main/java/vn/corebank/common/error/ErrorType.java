package vn.corebank.common.error;

/**
 * Loại lỗi nghiệp vụ. Tầng domain chỉ nói lỗi thuộc loại nào, không biết gì về HTTP;
 * {@link vn.corebank.common.web.GlobalExceptionHandler} mới đổi loại lỗi thành mã HTTP.
 */
public enum ErrorType {

    /** Dữ liệu gửi lên sai (HTTP 400). */
    INVALID_INPUT,

    /** Chưa xác thực, hoặc thông tin đăng nhập sai (HTTP 401). */
    UNAUTHORIZED,

    /** Đã xác thực nhưng không được phép, ví dụ tài khoản đăng nhập bị khóa (HTTP 403). */
    FORBIDDEN,

    /** Không tìm thấy, hoặc không thuộc về người đang hỏi (HTTP 404). */
    NOT_FOUND,

    /** Vi phạm quy tắc với trạng thái hiện tại, hoặc trùng dữ liệu (HTTP 409). */
    CONFLICT
}
