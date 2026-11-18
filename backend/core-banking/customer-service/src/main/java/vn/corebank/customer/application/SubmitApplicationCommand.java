package vn.corebank.customer.application;

import vn.corebank.customer.domain.model.DocumentType;
import vn.corebank.customer.domain.model.IdentityData;

import java.util.Map;

/**
 * Dữ liệu khách gửi khi đăng ký.
 *
 * @param identity       thông tin giấy tờ (app đọc từ mã QR trên CCCD) và liên hệ
 * @param documents      ảnh mặt trước, mặt sau CCCD và ảnh chân dung
 * @param consentVersion phiên bản văn bản đồng ý xử lý dữ liệu cá nhân mà khách đã đọc
 */
public record SubmitApplicationCommand(IdentityData identity, Map<DocumentType, byte[]> documents, String consentVersion) {
}
