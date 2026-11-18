import { useCallback } from 'react';

import { useAuth } from '@/features/auth/store/authStore';
import type { ReviewResult } from '@/models';

/**
 * Gọi API duyệt hồ sơ kèm access token của phiên đăng nhập. API trả 401 (token hết hạn hoặc bị thu hồi) thì bỏ phiên
 * và đưa về màn đăng nhập kèm thông báo, nên màn hình chỉ cần bỏ qua lỗi 'sessionExpired'.
 */
export function useReviewApi() {
  const { getAccessToken, expireSession } = useAuth();
  return useCallback(
    async <T>(request: (accessToken: string) => Promise<ReviewResult<T>>): Promise<ReviewResult<T>> => {
      const accessToken = getAccessToken();
      // Không còn token: phiên đã đóng (vừa đăng xuất hoặc vừa hết hạn), không gọi API nữa.
      if (!accessToken) return { ok: false, error: 'sessionExpired' };
      const result = await request(accessToken);
      if (!result.ok && result.error === 'sessionExpired') expireSession();
      return result;
    },
    [getAccessToken, expireSession],
  );
}
