import { createContext, useContext, useState, type ReactNode } from 'react';

import type { LoginRequest, LoginResponse, User } from '@/models';
import * as authService from '@/services/auth.service';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (req: LoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  async function login(req: LoginRequest): Promise<LoginResponse> {
    setLoading(true);
    try {
      const res = await authService.login(req);
      if (res.success && res.user) setUser(res.user);
      return res;
    } finally {
      setLoading(false);
    }
  }

  async function logout(): Promise<void> {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
