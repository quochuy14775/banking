import { mockAccounts } from '@/lib/mockData';
import type { GetAccountsRequest, GetAccountsResponse } from '@/models';

export async function getAccounts(req: GetAccountsRequest): Promise<GetAccountsResponse> {
  if (!req.userId) return { success: false, items: [], message: 'Thiếu thông tin người dùng.' };
  // Trả bản sao để màn hình nhận ra số dư đã đổi sau mỗi giao dịch (mock cộng/trừ thẳng vào mockAccounts).
  return { success: true, items: mockAccounts.map((account) => ({ ...account })) };
}
