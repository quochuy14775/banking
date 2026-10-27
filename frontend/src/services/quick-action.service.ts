import { mockQuickActions } from '@/lib/mockData';
import type { GetQuickActionsRequest, GetQuickActionsResponse } from '@/models';

export async function getQuickActions(req: GetQuickActionsRequest): Promise<GetQuickActionsResponse> {
  if (!req.userId) {
    return { success: false, actions: [], message: 'Thiếu thông tin người dùng.' };
  }
  return { success: true, actions: mockQuickActions };
}
