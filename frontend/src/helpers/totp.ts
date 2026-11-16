import { CryptoDigestAlgorithm, digest } from 'expo-crypto';

// Mã dùng một lần theo thời gian (TOTP, RFC 6238), cùng chuẩn với Google Authenticator: HMAC-SHA1, 6 số,
// đổi mỗi 30 giây. Máy và server cùng giữ một khóa bí mật, mỗi bên tự tính mã từ khóa và giờ hiện tại.
// Theo đúng chuẩn nên khi có BE, server dùng thư viện TOTP có sẵn là khớp với mã app tạo ra.
export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;

const SHA1_BLOCK_BYTES = 64;
const SHA1_BYTES = 20;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

async function sha1(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await digest(CryptoDigestAlgorithm.SHA1, data));
}

// HMAC theo RFC 2104. expo-crypto chỉ có hàm băm nên tự ghép: băm hai lần với khóa đã đệm đủ một khối.
async function hmacSha1(key: Uint8Array<ArrayBuffer>, message: Uint8Array<ArrayBuffer>) {
  const block = new Uint8Array(SHA1_BLOCK_BYTES);
  block.set(key.length > SHA1_BLOCK_BYTES ? await sha1(key) : key);
  const inner = new Uint8Array(SHA1_BLOCK_BYTES + message.length);
  const outer = new Uint8Array(SHA1_BLOCK_BYTES + SHA1_BYTES);
  for (let i = 0; i < SHA1_BLOCK_BYTES; i++) {
    inner[i] = block[i] ^ 0x36;
    outer[i] = block[i] ^ 0x5c;
  }
  inner.set(message, SHA1_BLOCK_BYTES);
  outer.set(await sha1(inner), SHA1_BLOCK_BYTES);
  return sha1(outer);
}

/** Số thứ tự của khoảng 30 giây chứa thời điểm `timeMs`; mã đổi khi số này đổi. */
export function totpStep(timeMs: number): number {
  return Math.floor(timeMs / 1000 / TOTP_PERIOD_SECONDS);
}

/** Số giây còn lại trước khi mã đổi (1–30). */
export function totpSecondsLeft(timeMs: number): number {
  return TOTP_PERIOD_SECONDS - (Math.floor(timeMs / 1000) % TOTP_PERIOD_SECONDS);
}

/** Mã của một khoảng thời gian (HOTP, RFC 4226): HMAC của số thứ tự dạng 8 byte, rồi cắt lấy 6 số. */
export async function totpAtStep(secretHex: string, step: number): Promise<string> {
  const counter = new Uint8Array(8);
  const view = new DataView(counter.buffer);
  view.setUint32(0, Math.floor(step / 2 ** 32));
  view.setUint32(4, step >>> 0);
  const mac = await hmacSha1(hexToBytes(secretHex), counter);
  const offset = mac[mac.length - 1] & 0x0f;
  const value =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(value % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/** Mã TOTP tại thời điểm `timeMs`. */
export function totp(secretHex: string, timeMs: number): Promise<string> {
  return totpAtStep(secretHex, totpStep(timeMs));
}
