import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';

/**
 * Navigation items with optional permission guard.
 * Items without `permission` are visible to all authenticated users.
 */
const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '🏠', permission: null },
  { to: '/portal', label: 'Cổng Khách hàng', icon: '👤', permission: 'customer.self_service' },
  { to: '/customers', label: 'Khách hàng & Thiết bị', icon: '👥', permission: 'intake.manage' },
  { to: '/users', label: 'Quản lý Nhân viên', icon: '👔', permission: 'system.manage', altPermission: 'operations.manage' },
  { to: '/repairs', label: 'Phiếu sửa chữa', icon: '🔧', permission: 'repair.manage', altPermission: 'intake.manage' },
  { to: '/inventory', label: 'Kho vật tư', icon: '📦', permission: 'inventory.manage', altPermission: 'warehouse.manage' },
  { to: '/reports', label: 'Báo cáo & Thống kê', icon: '📊', permission: 'reports.view', altPermission: 'operations.manage' },
];

export default function Layout() {
  const { user, logout, hasPermission, getPrimaryRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    return parts[parts.length - 1][0].toUpperCase();
  };

  return (
    <div className={`layout ${sidebarOpen ? 'layout--sidebar-open' : ''}`}>
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="layout__overlay" onClick={toggleSidebar} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__brand-icon">⚡</span>
          <div>
            <div className="sidebar__brand-name">Vua Sửa Chữa</div>
            <div className="sidebar__brand-tagline">Repair Management</div>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Điều hướng chính">
          <ul className="sidebar__nav-list">
            {NAV_ITEMS.filter((item) => hasPermission(item.permission, item.altPermission)).map(
              (item) => (
                <li key={item.to} className="sidebar__nav-item">
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `sidebar__nav-link ${isActive ? 'sidebar__nav-link--active' : ''}`
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span className="sidebar__nav-icon" aria-hidden="true">{item.icon}</span>
                    <span className="sidebar__nav-label">{item.label}</span>
                  </NavLink>
                </li>
              )
            )}
          </ul>
        </nav>
      </aside>

      {/* Main area */}
      <div className="layout__main">
        {/* Header */}
        <header className="header">
          <button
            className="header__menu-btn"
            onClick={toggleSidebar}
            aria-label="Mở/đóng menu"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>

          <div className="header__spacer" />

          <div className="header__user">
            <div className="header__user-avatar" title={user?.fullName || user?.username}>
              {getInitials(user?.fullName || user?.username)}
            </div>
            <div className="header__user-info">
              <span className="header__user-name">{user?.fullName || user?.username}</span>
              <span className="header__user-role">{getPrimaryRole()}</span>
            </div>
            <button className="btn btn--outline btn--sm header__logout-btn" onClick={handleLogout} type="button">
              🚪 Đăng xuất
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="layout__content">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
