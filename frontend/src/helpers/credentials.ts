// Quy tắc tên đăng nhập và mật khẩu, theo auth-service (Usernames, PasswordPolicy) để báo lỗi ngay khi nhập.
// Backend vẫn kiểm tra lại; khi đổi quy tắc ở backend thì phải đổi cả ở đây.

export const USERNAME_MIN_LENGTH = 4;
export const USERNAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
/** BCrypt ở backend chỉ dùng 72 byte đầu của mật khẩu nên mật khẩu dài hơn bị từ chối. */
const PASSWORD_MAX_BYTES = 72;

const USERNAME_PATTERN = /^[a-z0-9._-]{4,50}$/;
// Chữ cái Latin (kể cả tiếng Việt có dấu) và chữ số 0-9. Backend nhận mọi chữ và chữ số Unicode
// (Character.isLetter/isDigit), nên với chữ ngoài bảng Latin app chặt hơn backend một chút.
const LETTER = /[a-zA-ZÀ-ɏḀ-ỿ]/;
const DIGIT = /[0-9]/;

/** Bỏ khoảng trắng hai đầu và đổi sang chữ thường, như backend: "An.Nguyen" và "an.nguyen" là một. */
export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export type UsernameIssue = 'required' | 'invalid';

export function checkUsername(value: string): UsernameIssue | null {
  const normalized = normalizeUsername(value);
  if (!normalized) return 'required';
  return USERNAME_PATTERN.test(normalized) ? null : 'invalid';
}

export type PasswordIssue = 'required' | 'length' | 'tooLong' | 'letterAndDigit';

export function checkPassword(value: string): PasswordIssue | null {
  if (!value) return 'required';
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) return 'length';
  if (utf8Length(value) > PASSWORD_MAX_BYTES) return 'tooLong';
  if (!LETTER.test(value) || !DIGIT.test(value)) return 'letterAndDigit';
  return null;
}

/** Số byte khi mã hóa UTF-8, tự tính để không phụ thuộc TextEncoder trên từng nền tảng. */
function utf8Length(value: string): number {
  let bytes = 0;
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    bytes += code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
  }
  return bytes;
}
