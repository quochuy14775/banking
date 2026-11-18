package vn.corebank.account.domain.model;

/**
 * Trạng thái tài khoản. Các bước chuyển hợp lệ (kiểm tra trong AccountRules): ACTIVE ⇄ FROZEN và ACTIVE → CLOSED.
 */
public enum AccountStatus {

    /** Đang hoạt động: nhận và chuyển tiền bình thường. */
    ACTIVE,

    /** Bị phong tỏa: không giao dịch được cho tới khi được gỡ phong tỏa. */
    FROZEN,

    /** Đã đóng: trạng thái cuối cùng, không mở lại được. */
    CLOSED
}
