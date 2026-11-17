import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InventoryPage from './pages/InventoryPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import CustomerPortalPage from './pages/CustomerPortalPage.jsx';
import RepairDetailPage from './pages/RepairDetailPage.jsx';
import RepairIntakePage from './pages/RepairIntakePage.jsx';
import RepairsListPage from './pages/RepairsListPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 * Shows a full-page spinner while the auth session is being restored.
 */
function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Đang kiểm tra phiên đăng nhập..." />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

/**
 * GuestRoute — redirects authenticated users to /dashboard.
 * Useful for the login page so authenticated users don't see it.
 */
function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingSpinner message="Đang tải..." />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
}

/**
 * App — root router setup.
 *
 * Route tree:
 *   /login          → LoginPage  (guest only)
 *   /               → Layout
 *     /             → redirect to /dashboard
 *     /dashboard    → DashboardPage
 *   *               → redirect to /dashboard (catch-all)
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Guest-only routes */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes with shared Layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          {/* Customer Self-service Portal */}
          <Route path="/portal" element={<CustomerPortalPage />} />
          {/* Core repair workflow pages */}
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/repairs" element={<RepairsListPage />} />
          <Route path="/repairs/new" element={<RepairIntakePage />} />
          <Route path="/repairs/:id" element={<RepairDetailPage />} />
          {/* Operations & Reports pages */}
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
