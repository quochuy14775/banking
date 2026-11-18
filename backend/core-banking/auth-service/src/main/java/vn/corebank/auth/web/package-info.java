/**
 * Tầng web (REST API): controller, DTO request/response. Lỗi được xử lý chung bởi
 * {@code GlobalExceptionHandler} trong module common.
 *
 * <p>Quy tắc phụ thuộc: chỉ gọi {@code application}. Không trả entity ra ngoài mà luôn đổi sang DTO,
 * để đổi cấu trúc bảng không làm vỡ API mà app đang dùng.
 */
package vn.corebank.auth.web;
