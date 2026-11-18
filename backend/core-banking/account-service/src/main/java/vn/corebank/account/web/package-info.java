/**
 * Tầng web (REST API): controller, DTO request/response, chuyển lỗi nghiệp vụ thành phản hồi HTTP.
 *
 * <p>Quy tắc phụ thuộc: chỉ gọi {@code application}. Không trả entity ra ngoài mà luôn đổi sang DTO,
 * để đổi cấu trúc bảng không làm vỡ API mà app đang dùng.
 */
package vn.corebank.account.web;
