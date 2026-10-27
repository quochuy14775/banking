import { mockFinancialHealth } from '@/lib/mockData';
import type { GetFinancialHealthRequest, GetFinancialHealthResponse } from '@/models';

export async function getFinancialHealth(req: GetFinancialHealthRequest): Promise<GetFinancialHealthResponse> {
  if (!req.userId) return { success: false, message: 'Thiếu thông tin người dùng.' };
  return { success: true, data: mockFinancialHealth };
}
