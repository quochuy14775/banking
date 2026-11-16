// Mã VietQR (chuẩn EMVCo của NAPAS): chuỗi TLV, mỗi trường = ID 2 số + độ dài 2 số + giá trị.

const NAPAS_GUID = 'A000000727';
const SERVICE_ACCOUNT_TRANSFER = 'QRIBFTTA';
const CURRENCY_VND = '704';
const COUNTRY_VN = 'VN';

const ID = {
  version: '00',
  initMethod: '01',
  merchantAccount: '38',
  currency: '53',
  amount: '54',
  country: '58',
  merchantName: '59',
  additional: '62',
  crc: '63',
} as const;

const MERCHANT = { guid: '00', beneficiary: '01', service: '02' } as const;
const BENEFICIARY = { bin: '00', account: '01' } as const;
const ADDITIONAL_PURPOSE = '08';

export interface VietQrData {
  bin: string;
  accountNumber: string;
  amount?: number;
  note?: string;
  name?: string;
}

function field(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

function parseTlv(payload: string): Map<string, string> | null {
  const fields = new Map<string, string>();
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) return null;
    const id = payload.slice(i, i + 2);
    const length = Number(payload.slice(i + 2, i + 4));
    if (!Number.isInteger(length) || i + 4 + length > payload.length) return null;
    fields.set(id, payload.slice(i + 4, i + 4 + length));
    i += 4 + length;
  }
  return fields;
}

// CRC-16/CCITT-FALSE (đa thức 0x1021, khởi tạo 0xFFFF) theo chuẩn EMVCo.
function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

// Tên trong QR chỉ nên là ASCII; bỏ dấu tiếng Việt cho chắc.
function toAscii(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^\x20-\x7E]/g, '');
}

export function buildVietQr({ bin, accountNumber, amount, note, name }: VietQrData): string {
  const beneficiary = field(BENEFICIARY.bin, bin) + field(BENEFICIARY.account, accountNumber.replace(/\D/g, ''));
  const merchant =
    field(MERCHANT.guid, NAPAS_GUID) +
    field(MERCHANT.beneficiary, beneficiary) +
    field(MERCHANT.service, SERVICE_ACCOUNT_TRANSFER);

  let payload =
    field(ID.version, '01') +
    // 11 = mã tĩnh (dùng nhiều lần), 12 = mã động (có số tiền cụ thể).
    field(ID.initMethod, amount ? '12' : '11') +
    field(ID.merchantAccount, merchant) +
    field(ID.currency, CURRENCY_VND);
  if (amount) payload += field(ID.amount, String(Math.round(amount)));
  payload += field(ID.country, COUNTRY_VN);
  if (name) payload += field(ID.merchantName, toAscii(name).slice(0, 25));
  if (note) payload += field(ID.additional, field(ADDITIONAL_PURPOSE, toAscii(note).slice(0, 50)));

  payload += `${ID.crc}04`;
  return payload + crc16(payload);
}

/** Trả về null nếu không phải mã VietQR chuyển khoản hợp lệ (sai cấu trúc, sai CRC, không phải NAPAS). */
export function parseVietQr(raw: string): VietQrData | null {
  const payload = raw.trim();
  const crcIndex = payload.lastIndexOf(`${ID.crc}04`);
  if (crcIndex < 0 || crcIndex + 8 !== payload.length) return null;
  if (crc16(payload.slice(0, crcIndex + 4)) !== payload.slice(crcIndex + 4).toUpperCase()) return null;

  const fields = parseTlv(payload);
  const merchant = fields && parseTlv(fields.get(ID.merchantAccount) ?? '');
  if (!fields || !merchant || merchant.get(MERCHANT.guid) !== NAPAS_GUID) return null;

  const beneficiary = parseTlv(merchant.get(MERCHANT.beneficiary) ?? '');
  const bin = beneficiary?.get(BENEFICIARY.bin);
  const accountNumber = beneficiary?.get(BENEFICIARY.account);
  if (!bin || !accountNumber) return null;

  const amount = Number(fields.get(ID.amount));
  const note = parseTlv(fields.get(ID.additional) ?? '')?.get(ADDITIONAL_PURPOSE);
  return {
    bin,
    accountNumber,
    amount: amount > 0 ? amount : undefined,
    note: note || undefined,
    name: fields.get(ID.merchantName) || undefined,
  };
}
