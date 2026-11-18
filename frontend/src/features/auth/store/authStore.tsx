import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import type { FaceIdLoginRequest, LoginRequest, LoginResponse, SessionTokens, StaffUser, User } from '@/models';
import * as authService from '@/services/auth.service';

interface AuthContextValue {
  /** Khách hàng đang đăng nhập; null nếu chưa đăng nhập hoặc người đăng nhập là nhân viên. */
  user: User | null;
  /** Nhân viên đang đăng nhập (vai trò ADMIN): app hiện màn duyệt hồ sơ thay cho các tab của khách. */
  staff: StaffUser | null;
  /** true khi vừa bị đưa về màn đăng nhập vì phiên hết hạn (API trả 401); tắt khi đăng nhập lại. */
  sessionExpired: boolean;
  loading: boolean;
  login: (req: LoginRequest) => Promise<LoginResponse>;
  loginWithFaceId: (req: FaceIdLoginRequest) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  /**
   * Access token của phiên đăng nhập thật để gửi kèm khi gọi API; null ở chế độ mock hoặc khi chưa đăng nhập.
   * Chỉ gọi trong hàm xử lý sự kiện hoặc effect, không gọi khi render.
   */
  getAccessToken: () => string | null;
  /** API trả 401 (token hết hạn hoặc bị thu hồi): bỏ phiên, về màn đăng nhập kèm thông báo. */
  expireSession: () => void;
  /** Cập nhật một phần hồ sơ người dùng đang đăng nhập (vd sau khi xác thực eKYC). */
  updateUser: (patch: Partial<User>) => void;
}

type Session = { kind: 'customer'; user: User } | { kind: 'staff'; staff: StaffUser };

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  // Token không dùng để vẽ giao diện nên giữ trong ref: chỉ nằm trong bộ nhớ, đổi token không làm vẽ lại app.
  const tokens = useRef<SessionTokens | null>(null);

  async function signIn(request: () => Promise<LoginResponse>): Promise<LoginResponse> {
    setLoading(true);
    try {
      const res = await request();
      const next: Session | null = !res.success
        ? null
        : res.staff
          ? { kind: 'staff', staff: res.staff }
          : res.user
            ? { kind: 'customer', user: res.user }
            : null;
      if (next) {
        tokens.current = res.tokens ?? null;
        setSession(next);
        setSessionExpired(false);
      }
      return res;
    } finally {
      setLoading(false);
    }
  }

  const login = (req: LoginRequest) => signIn(() => authService.login(req));
  const loginWithFaceId = (req: FaceIdLoginRequest) => signIn(() => authService.loginWithFaceId(req));

  const updateUser = (patch: Partial<User>) =>
    setSession((prev) => (prev?.kind === 'customer' ? { ...prev, user: { ...prev.user, ...patch } } : prev));

  async function logout(): Promise<void> {
    const refreshToken = tokens.current?.refreshToken;
    tokens.current = null;
    if (session?.kind === 'staff') {
      if (refreshToken) void authService.revokeSession(refreshToken);
    } else {
      // Khách chủ động đăng xuất: quên luôn trên máy (xem auth.service).
      await authService.logout(refreshToken);
    }
    setSession(null);
  }

  const getAccessToken = useCallback(() => tokens.current?.accessToken ?? null, []);

  const expireSession = useCallback(() => {
    // Chỉ lần gọi đầu có tác dụng: nhiều API cùng nhận 401 (vd danh sách và ảnh), hoặc 401 về muộn sau khi đã
    // đăng xuất, thì phiên đã đóng rồi.
    const current = tokens.current;
    if (!current) return;
    tokens.current = null;
    // Refresh token có thể vẫn còn hạn: thu hồi để phiên này không dùng lại được.
    void authService.revokeSession(current.refreshToken);
    setSession(null);
    setSessionExpired(true);
  }, []);

  const user = session?.kind === 'customer' ? session.user : null;
  const staff = session?.kind === 'staff' ? session.staff : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        staff,
        sessionExpired,
        loading,
        login,
        loginWithFaceId,
        logout,
        getAccessToken,
        expireSession,
        updateUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
