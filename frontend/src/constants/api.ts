/**
 * Địa chỉ các service backend, đọc từ file .env.local (xem .env.example).
 *
 * Để trống thì app chạy bằng dữ liệu mock (chế độ demo, không cần backend), ví dụ bản gửi HR xem thử.
 * Biến EXPO_PUBLIC_ được ghi thẳng vào app lúc đóng gói và ai cũng đọc được, nên chỉ chứa địa chỉ, không chứa bí mật.
 * Phải viết đúng dạng process.env.EXPO_PUBLIC_... (không destructure) thì Expo mới thay được giá trị.
 */
export const AUTH_API_URL = (process.env.EXPO_PUBLIC_AUTH_API_URL ?? 'http://localhost:9003/').trim().replace(/\/+$/, '');

/** Chưa cấu hình địa chỉ auth-service thì phần đăng ký, đăng nhập dùng mock. */
export const USE_MOCK_AUTH = AUTH_API_URL === '';

export const CUSTOMER_API_URL = (process.env.EXPO_PUBLIC_CUSTOMER_API_URL ?? 'http://localhost:9001/')
  .trim()
  .replace(/\/+$/, '');

/** Chưa cấu hình địa chỉ customer-service thì bước đọc CCCD và xác thực khuôn mặt khi đăng ký dùng mock. */
export const USE_MOCK_CUSTOMER = CUSTOMER_API_URL === '';
