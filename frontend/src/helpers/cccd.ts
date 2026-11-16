import type { CccdInfo, CccdQrResult, Gender } from '@/models';

const ID_RE = /^\d{12}$/;
const OLD_ID_RE = /^\d{9}$/;
const DATE_RE = /^(\d{2})(\d{2})(\d{4})$/;

/** `ddMMyyyy` → ISO `yyyy-MM-dd`; `null` nếu không phải ngày có thật. */
function toIsoDate(value: string): string | null {
  const match = DATE_RE.exec(value.trim());
  if (!match) return null;
  const [, dd, mm, yyyy] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
  if (date.getFullYear() !== Number(yyyy) || date.getMonth() !== Number(mm) - 1 || date.getDate() !== Number(dd)) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

function toGender(value: string): Gender | null {
  const v = value.trim().normalize('NFC').toLowerCase();
  if (v === 'nam') return 'male';
  if (v === 'nữ' || v === 'nu') return 'female';
  return null;
}

/**
 * Kiểm tra chéo số CCCD với ngày sinh và giới tính: số thứ 4 mã hóa giới tính + thế kỷ sinh
 * (0/1 = nam/nữ sinh 1900–1999, 2/3 = 2000–2099, 4/5 = 2100–2199...), số 5–6 là hai số cuối năm sinh.
 */
function matchesIdNumber(idNumber: string, dateOfBirth: string, gender: Gender): boolean {
  const code = Number(idNumber[3]);
  const year = 1900 + Math.floor(code / 2) * 100 + Number(idNumber.slice(4, 6));
  const expectedGender: Gender = code % 2 === 0 ? 'male' : 'female';
  return year === Number(dateOfBirth.slice(0, 4)) && gender === expectedGender;
}

/**
 * Đọc mã QR ở mặt trước CCCD gắn chip. Nội dung là các trường cách nhau bằng `|`:
 * `số CCCD | số CMND cũ | họ tên | ngày sinh | giới tính | nơi thường trú | ngày cấp`, ngày dạng `ddMMyyyy`.
 * Mẫu thẻ Căn cước mới có thể khác định dạng nên cần thử lại với thẻ thật.
 */
export function parseCccdQr(data: string): CccdQrResult {
  const parts = data.normalize('NFC').trim().split('|').map((p) => p.trim());
  if (parts.length < 6) return { ok: false, reason: 'format' };
  const [idNumber, oldIdNumber, rawName, rawDob, rawGender, rawAddress, rawIssue] = parts;
  const fullName = rawName.replace(/\s+/g, ' ');
  const dateOfBirth = toIsoDate(rawDob);
  const gender = toGender(rawGender);
  const permanentAddress = rawAddress.replace(/\s+/g, ' ');
  if (!ID_RE.test(idNumber) || !fullName || !dateOfBirth || !gender || !permanentAddress) {
    return { ok: false, reason: 'format' };
  }
  if (!matchesIdNumber(idNumber, dateOfBirth, gender)) return { ok: false, reason: 'mismatch' };

  const info: CccdInfo = { idNumber, fullName, dateOfBirth, gender, permanentAddress };
  if (OLD_ID_RE.test(oldIdNumber)) info.oldIdNumber = oldIdNumber;
  const issueDate = rawIssue ? toIsoDate(rawIssue) : null;
  if (issueDate) info.issueDate = issueDate;
  return { ok: true, info };
}

/** Che ngày sinh khi ẩn thông tin cá nhân: chỉ giữ năm. */
export function maskDateOfBirth(iso: string): string {
  return `••/••/${iso.slice(0, 4)}`;
}
