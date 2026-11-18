/**
 * Tầng nghiệp vụ (domain), chia thư mục con giống nhau ở mọi service:
 * <ul>
 *   <li>{@code model}: entity và enum, chỉ chứa dữ liệu (field + getter/setter)</li>
 *   <li>{@code rule}: hàm nghiệp vụ; là nơi DUY NHẤT được tạo entity và gọi setter (ArchitectureTest kiểm tra)</li>
 *   <li>{@code repository}: truy cập database</li>
 *   <li>{@code exception}: lỗi nghiệp vụ</li>
 *   <li>{@code port}: interface mà tầng infrastructure cài đặt</li>
 *   <li>{@code support}: helper thuần Java</li>
 * </ul>
 *
 * <p>Quy tắc phụ thuộc: tầng này không gọi tới {@code application}, {@code web}, {@code infrastructure}
 * hay {@code config}. Nó chỉ dùng JPA để ánh xạ bảng và module {@code common}.
 */
package vn.corebank.account.domain;
