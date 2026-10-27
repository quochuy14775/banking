import type { User } from '@/models';

const digitsOf = (value: string) => value.replace(/\D/g, '');

export function removeDiacritics(value: string): string {
  const base = typeof value.normalize === 'function' ? value.normalize('NFD') : value;
  return base.replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

export function toCardName(fullName: string): string {
  return removeDiacritics(fullName).toUpperCase();
}

export function maskPhone(phone: string): string {
  const d = digitsOf(phone);
  if (d.length < 7) return phone;
  return `${d.slice(0, 4)} *** ${d.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const visible = Math.min(4, Math.max(1, Math.floor(local.length / 2)));
  return `${local.slice(0, visible)}***@${domain}`;
}

export function maskIdNumber(idNumber: string): string {
  const d = digitsOf(idNumber);
  if (d.length < 8) return idNumber;
  return `${d.slice(0, 4)} **** ${d.slice(-4)}`;
}

export function buildReceiveQrPayload(user: Pick<User, 'accountNumber' | 'fullName'>): string {
  return `VIETBANK|${digitsOf(user.accountNumber)}|${toCardName(user.fullName)}`;
}
