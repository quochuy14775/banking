/**
 * Tầng ứng dụng (use case): điều phối trọn một nghiệp vụ, ví dụ đăng ký, đăng nhập, làm mới token, đăng xuất.
 * Đặt ranh giới transaction ({@code @Transactional}) và gọi repository.
 *
 * <p>Quy tắc phụ thuộc: được {@code web} gọi tới; chỉ dùng {@code domain} (và {@code config} để đọc cấu hình).
 */
package vn.corebank.auth.application;
