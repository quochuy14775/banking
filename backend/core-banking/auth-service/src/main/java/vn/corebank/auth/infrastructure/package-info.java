/**
 * Tầng hạ tầng: cài đặt cụ thể cho các interface mà {@code domain} khai báo, khi cần tới database,
 * hệ thống bên ngoài hoặc thư viện kỹ thuật. Ví dụ: ký access token dạng JWT.
 *
 * <p>Quy tắc phụ thuộc: chỉ dùng {@code domain} (và {@code config} để đọc cấu hình).
 */
package vn.corebank.auth.infrastructure;
