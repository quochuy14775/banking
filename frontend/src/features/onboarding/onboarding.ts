import type { DocumentKind } from '@/models';

/** Thứ tự chụp ảnh kèm hồ sơ đăng ký. */
export const DOCUMENT_KINDS = ['idFront', 'idBack', 'portrait'] as const satisfies readonly DocumentKind[];

/** Phiên bản văn bản đồng ý xử lý dữ liệu cá nhân đang hiển thị. Đổi nội dung câu đồng ý thì tăng phiên bản. */
export const DATA_CONSENT_VERSION = '2026-01';

/**
 * Ảnh thu nhỏ về chiều rộng này trước khi gửi: đủ để nhân viên đọc chữ trên CCCD, mỗi ảnh khoảng 100–300 KB
 * (server nhận tối đa 2 MB mỗi ảnh).
 */
export const PHOTO_MAX_WIDTH = 1280;
export const PHOTO_JPEG_QUALITY = 0.7;
