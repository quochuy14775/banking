import { mockAppFeatures } from '@/lib/mockData';
import type { GetAppFeaturesResponse } from '@/models';

// Danh sách chức năng cho ô tìm kiếm; sau này BE có thể trả theo quyền/gói của từng người dùng.
export async function getAppFeatures(): Promise<GetAppFeaturesResponse> {
  return { success: true, items: mockAppFeatures };
}
