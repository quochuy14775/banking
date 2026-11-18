package vn.corebank.account.domain.port;

/**
 * Cấp số tài khoản mới, không trùng với số đã cấp.
 * Là interface để tầng application không phụ thuộc vào cách sinh số (sequence của DB, theo chi nhánh...),
 * và để test thay được bằng bản sinh số cố định.
 */
public interface AccountNumberGenerator {

    /** Số tài khoản 12 chữ số, chữ số cuối là chữ số kiểm tra. */
    String next();
}
