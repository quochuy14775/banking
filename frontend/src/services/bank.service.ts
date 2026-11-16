import { APP_BANK, mockBanks } from '@/lib/mockData';
import type { Bank, GetBanksResponse } from '@/models';

export async function getBanks(): Promise<GetBanksResponse> {
  return { success: true, items: [APP_BANK, ...mockBanks] };
}

export async function getBankByBin(bin: string): Promise<Bank | null> {
  return [APP_BANK, ...mockBanks].find((b) => b.bin === bin) ?? null;
}

export async function getBankByCode(code: string): Promise<Bank | null> {
  return [APP_BANK, ...mockBanks].find((b) => b.code === code) ?? null;
}

/** Ngân hàng của chính app, dùng để tạo mã QR nhận tiền. */
export function getAppBank(): Bank {
  return APP_BANK;
}
