import { createContext, useContext, useState, type ReactNode } from 'react';

import type { FaceIdLoginRequest, LoginRequest, LoginResponse, User } from '@/models';
import * as authService from '@/services/auth.service';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (req: LoginRequest) => Promise<LoginResponse>;
  loginWithFaceId: (req: FaceIdLoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  /** Cập nhật một phần hồ sơ người dùng đang đăng nhập (vd sau khi xác thực eKYC). */
  updateUser: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn(request: () => Promise<LoginResponse>): Promise<LoginResponse> {
    setLoading(true);
    try {
      const res = await request();
      if (res.success && res.user) setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }

  const login = (req: LoginRequest) => signIn(() => authService.login(req));
  const loginWithFaceId = (req: FaceIdLoginRequest) => signIn(() => authService.loginWithFaceId(req));

  const updateUser = (patch: Partial<User>) => setUser((prev) => (prev ? { ...prev, ...patch } : prev));

  async function logout(): Promise<void> {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithFaceId, logout, updateUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
