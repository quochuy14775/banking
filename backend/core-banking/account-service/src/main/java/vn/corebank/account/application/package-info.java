/**
 * Tầng ứng dụng (use case): điều phối trọn một nghiệp vụ, ví dụ mở tài khoản, tra cứu tài khoản của người dùng.
 * Đặt ranh giới transaction ({@code @Transactional}), gọi repository và sau này gọi service khác như ledger-service.
 *
 * <p>Quy tắc phụ thuộc: được {@code web} gọi tới; chỉ dùng {@code domain} (và {@code config} để đọc cấu hình).
 */
package vn.corebank.account.application;
