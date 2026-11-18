# Customer-service: danh sách bảng (luồng onboarding mới)

Luồng: quét chip NFC CCCD → quay mặt 4 góc → duyệt → tạo user (auth) + tài khoản (account) → gắn thiết bị / Smart OTP.
SĐT không còn là yếu tố xác thực, chỉ là thông tin liên hệ.

Schema: `customer` (user DB `customer_svc`).

## Bảng bắt buộc: 7 bảng

| # | Bảng | Vai trò | Cột chính |
|---|---|---|---|
| 1 | `customer` | Hồ sơ khách hàng (CIF) | id, cif_number, full_name, date_of_birth, gender, national_id (unique), address, phone (thông tin liên hệ), email, status, kyc_status, risk_level |
| 2 | `identity_document` | Dữ liệu đọc từ chip CCCD | customer_id, doc_number, issue_date, expiry_date, chip_data_hash, passive_auth_result, read_at |
| 3 | `kyc_case` | Mỗi lần làm KYC (có thể làm lại) | id, customer_id, status (PENDING_REVIEW / APPROVED / REJECTED), liveness_score, face_match_score, submitted_at |
| 4 | `kyc_document` | Ảnh/file của một kyc_case (chỉ lưu đường dẫn) | kyc_case_id, doc_type (ID_FRONT, ID_BACK, FACE_ANGLE), file_key, sha256, purge_after |
| 5 | `face_template` | Embedding khuôn mặt cho so khớp sau này | customer_id, angle (FRONT/LEFT/RIGHT/UP/DOWN), embedding (BYTEA, mã hóa), model_version |
| 6 | `kyc_review` | Quyết định duyệt của nhân viên (maker-checker) | kyc_case_id, decision, reviewer_id, reason, reviewed_at |
| 7 | `biometric_consent` | Sự đồng ý thu thập sinh trắc học (Nghị định 13/2023) | customer_id, consent_version, granted_at, revoked_at |

## Bảng tùy chọn: 1 bảng

| # | Bảng | Khi nào cần |
|---|---|---|
| 8 | `outbox_event` | Nếu dùng sự kiện (CustomerVerified) để auth/account tự phản ứng, thay vì gọi REST tuần tự |

## Tổng: 7 bảng bắt buộc, 8 nếu dùng outbox.

## Không nằm trong customer-service
- `user_device` (public_key, device_id) và `otp_challenge` → **auth-service** (gắn khóa Smart OTP).
- `account` → **account-service** (owner_id = customer.id).

## Ghi chú thiết kế
- Có thể gộp `identity_document` vào `customer` (còn 6 bảng) nếu muốn đơn giản; tách ra thì lưu được lịch sử khi khách đổi/ cấp lại CCCD.
- Có thể gộp `kyc_review` vào `kyc_case` (còn 6 bảng) nếu chỉ có một lần duyệt mỗi hồ sơ.
- `embedding`, `national_id`, `phone` mã hóa ở tầng ứng dụng.
- Ảnh gốc xóa sau khi duyệt (`purge_after`), giữ lại embedding và kết quả.
- Chưa xác nhận được việc xác minh chữ ký chip (Passive Authentication) có làm được không, do cần chứng thư gốc của Bộ Công an. Cột `passive_auth_result` cho phép NULL.
- Chưa quyết định: tách `customer-service` riêng hay gộp vào `account-service`.
