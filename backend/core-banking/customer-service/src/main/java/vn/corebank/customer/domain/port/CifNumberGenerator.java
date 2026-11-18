package vn.corebank.customer.domain.port;

/**
 * Cấp số CIF mới, không trùng với số đã cấp.
 * Là interface để tầng application không phụ thuộc vào cách sinh số, và để test thay được bằng bản sinh số cố định.
 */
public interface CifNumberGenerator {

    /** Số CIF 10 chữ số. */
    String next();
}
