import { mockUser } from '@/lib/mockData';
import type { LoginRequest, LoginResponse } from '@/models';

const MOCK_DELAY_MS = 600;

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const username = req.username.trim();
  if (!username || !req.password) {
    return { success: false, message: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' };
  }
  await delay(MOCK_DELAY_MS);
  return { success: true, token: 'mock-token', user: { ...mockUser, username } };
}

export async function logout(): Promise<void> {}
