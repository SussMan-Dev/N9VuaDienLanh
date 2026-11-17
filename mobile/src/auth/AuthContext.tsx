import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, getMe, logout as apiLogout } from '../api/auth';
import { saveToken, getToken, clearToken } from './SecureTokenStore';
import { initServerUrl } from '../api/client';
import { registerPushToken, unregisterPushToken } from '../services/notification-service';

interface User {
  id: number;
  username: string;
  fullName: string;
  phone?: string;
  roles: string[];
  permissions: string[];
  primaryRole: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  /** Vai trò chính xác định giao diện nào sẽ hiện */
  primaryRole: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Khởi động: kiểm tra token đã lưu trong SecureStore
  useEffect(() => {
    (async () => {
      try {
        await initServerUrl();
        const token = await getToken();
        if (token) {
          const { data, error } = await getMe();
          if (data && !error) {
            setUser(normalizeUser(data));
          } else {
            await clearToken();
          }
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data, error } = await apiLogin(username, password);
    if (error || !data) return { error: error ?? 'Đăng nhập thất bại.' };

    await saveToken(data.token);

    // Lấy thông tin user đầy đủ từ /auth/me
    const meRes = await getMe();
    if (meRes.data) {
      setUser(normalizeUser(meRes.data));
    }
    // Đăng ký push token sau khi đăng nhập (không block)
    registerPushToken().catch(() => {});
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    try {
      await unregisterPushToken().catch(() => {});
      await apiLogout();
    } catch {}
    await clearToken();
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (role: string) => !!user?.roles?.includes(role),
    [user]
  );

  const hasPermission = useCallback(
    (permission: string) => !!user?.permissions?.includes(permission),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
        hasPermission,
        primaryRole: user?.primaryRole ?? null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

function normalizeUser(data: any): User {
  const u = data.user || data;
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName ?? u.full_name ?? '',
    phone: u.phone ?? '',
    roles: data.roles ?? u.roles ?? [],
    permissions: data.permissions ?? u.permissions ?? [],
    primaryRole: data.primaryRole ?? u.primaryRole ?? (data.roles?.[0] ?? u.roles?.[0] ?? 'STAFF'),
  };
}
