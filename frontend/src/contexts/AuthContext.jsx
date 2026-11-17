import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearToken, getToken } from '../api/client.js';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/auth.js';

/**
 * AuthContext
 * Provides: { user, roles, permissions, branchId, isLoading, isAuthenticated }
 * Actions:  login(username, password), logout()
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true while restoring session

  // Restore session on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    getMe()
      .then(({ data }) => {
        if (data && data.user) {
          setUser(data.user);
          setRoles(data.roles || []);
          setPermissions(data.permissions || []);
          setBranchId(data.branchId || null);
        } else {
          // Token invalid/expired
          clearToken();
          setUser(null);
          setRoles([]);
          setPermissions([]);
          setBranchId(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        clearToken();
        setUser(null);
        setRoles([]);
        setPermissions([]);
        setBranchId(null);
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (username, password) => {
    const { error } = await apiLogin(username, password);
    if (error) return { error };

    // After login, fetch user profile
    const meResult = await getMe();
    if (meResult.data && meResult.data.user) {
      setUser(meResult.data.user);
      setRoles(meResult.data.roles || []);
      setPermissions(meResult.data.permissions || []);
      setBranchId(meResult.data.branchId || null);
      return { error: null, user: meResult.data.user, roles: meResult.data.roles || [] };
    }

    return { error: meResult.error || 'Không thể tải thông tin người dùng.' };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setRoles([]);
    setPermissions([]);
    setBranchId(null);
  }, []);

  const hasPermission = useCallback(
    (perm, altPerm) => {
      if (!perm) return true;
      if (roles.includes('ADMIN')) return true;
      // Role-based implicit permissions
      if (perm === 'customer.self_service' && roles.includes('CUSTOMER')) return true;
      if ((perm === 'warehouse.manage' || perm === 'inventory.manage') && (roles.includes('WAREHOUSE_MANAGER') || roles.includes('WAREHOUSE_STAFF'))) return true;
      if ((perm === 'billing.manage' || perm === 'reports.view' || perm === 'repair.manage') && roles.includes('ACCOUNTANT')) return true;
      return permissions.includes(perm) || Boolean(altPerm && permissions.includes(altPerm));
    },
    [roles, permissions]
  );

  const hasRole = useCallback(
    (role) => roles.includes(role),
    [roles]
  );

  const getPrimaryRole = useCallback(
    () => {
      if (roles.includes('ADMIN')) return 'Quản trị viên';
      if (roles.includes('MANAGER')) return 'Quản lý';
      if (roles.includes('ACCOUNTANT')) return 'Kế toán';
      if (roles.includes('WAREHOUSE_STAFF') || roles.includes('WAREHOUSE_MANAGER')) return 'Thủ kho';
      if (roles.includes('RECEPTIONIST')) return 'Lễ tân';
      if (roles.includes('TECHNICIAN')) return 'Kỹ thuật viên';
      if (roles.includes('CUSTOMER')) return 'Khách hàng';
      return 'Người dùng';
    },
    [roles]
  );

  const value = {
    user,
    roles,
    permissions,
    branchId,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasRole,
    getPrimaryRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to consume AuthContext.
 * Must be used inside <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
