import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRepairOrders } from '../api/repairs.js';
import { getReportsSummary } from '../api/reports.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate, getRepairStatusInfo } from '../utils/formatters.js';

export default function DashboardPage() {
  const { user, roles = [], hasPermission } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [counts, setCounts] = useState({
    pending: 0,
    accepted: 0,
    assigned: 0,
    awaitingAdmin: 0,
    awaitingCustomer: 0,
    inProgress: 0,
    waitingParts: 0,
    completed: 0,
    paid: 0,
    delivered: 0,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = roles.includes('ADMIN');
  const isReceptionist = roles.includes('RECEPTIONIST');
  const isTechnician = roles.includes('TECHNICIAN');
  const isWarehouse = roles.includes('WAREHOUSE_MANAGER') || roles.includes('WAREHOUSE_STAFF');
  const isAccountant = roles.includes('ACCOUNTANT');

  const canReports = hasPermission('reports.view') || isAdmin || isAccountant;
  const canManageUsers = hasPermission('system.manage') || hasPermission('operations.manage') || isAdmin;

  useEffect(() => {
    if (roles.includes('CUSTOMER')) {
      navigate('/portal', { replace: true });
      return;
    }

    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const tasks = [getRepairOrders({ limit: 100 })];
        if (canReports) {
          tasks.push(getReportsSummary());
        }

        const [ordersRes, sumRes] = await Promise.all(tasks);

        if (ordersRes && !ordersRes.error && ordersRes.data) {
          const items = ordersRes.data.items || [];
          setRecentOrders(items.slice(0, 6));

          // Calculate counts across 10 stages
          const p = items.filter((r) => r.repairStatus === 'PENDING' || r.repairStatus === 'PENDING_RECEPTION').length;
          const acc = items.filter((r) => r.repairStatus === 'ACCEPTED' || r.repairStatus === 'RECEIVED').length;
          const asg = items.filter((r) => r.repairStatus === 'ASSIGNED' || r.repairStatus === 'DIAGNOSING').length;
          const aa = items.filter((r) => r.repairStatus === 'AWAITING_ADMIN_APPROVAL').length;
          const ac = items.filter((r) => r.repairStatus === 'AWAITING_CUSTOMER_APPROVAL' || r.repairStatus === 'WAITING_APPROVAL').length;
          const ip = items.filter((r) => r.repairStatus === 'IN_PROGRESS' || r.repairStatus === 'REPAIRING').length;
          const wp = items.filter((r) => r.repairStatus === 'WAITING_PARTS').length;
          const comp = items.filter((r) => r.repairStatus === 'COMPLETED').length;
          const pd = items.filter((r) => r.repairStatus === 'PAID').length;
          const dl = items.filter((r) => r.repairStatus === 'DELIVERED').length;

          setCounts({
            pending: p,
            accepted: acc,
            assigned: asg,
            awaitingAdmin: aa,
            awaitingCustomer: ac,
            inProgress: ip,
            waitingParts: wp,
            completed: comp,
            paid: pd,
            delivered: dl,
            total: items.length,
          });
        }
        if (sumRes && !sumRes.error && sumRes.data) {
          setSummary(sumRes.data);
        }
      } catch {
        // Fallback gracefully on network error
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, [roles, canReports, navigate]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  const getPrimaryRoleTitle = () => {
    if (isAdmin) return '👑 Quản trị viên Hệ thống (Admin)';
    if (isAccountant) return '💳 Kế toán & Thu ngân (Accountant)';
    if (isWarehouse) return '📦 Thủ kho & Quản lý Vật tư (Warehouse)';
    if (isTechnician) return '🔧 Kỹ thuật viên Sửa chữa (Technician)';
    if (isReceptionist) return '🛎️ Lễ tân / Tiếp nhận (Receptionist)';
    if (roles.includes('MANAGER')) return '👔 Quản lý Chi nhánh (Manager)';
    return 'Thành viên Hệ thống';
  };

  return (
    <div className="page dashboard-page">
      {/* Welcome Hero Banner */}
      <div className="dashboard-hero">
        <div className="dashboard-hero__content">
          <span className="dashboard-hero__role-badge">{getPrimaryRoleTitle()}</span>
          <h1 className="dashboard-hero__title">
            {getGreeting()}, <strong>{user?.fullName || user?.username}</strong>!
          </h1>
          <p className="dashboard-hero__subtitle">
            Hệ thống Quản lý Sửa chữa Điện Lạnh — Quy trình chuẩn 6 Vai trò & 10 Giai đoạn vận hành thông suốt.
          </p>
        </div>

        {/* Quick Actions Buttons tailored by Role */}
        <div className="dashboard-hero__quick-actions">
          {isAccountant ? (
            <>
              <button
                type="button"
                className="btn btn--primary font-semibold"
                onClick={() => navigate('/repairs')}
              >
                💳 Phiếu chờ thanh toán {counts.completed > 0 ? `(${counts.completed})` : ''}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate('/reports')}
              >
                📊 Sổ quỹ & Doanh thu
              </button>
            </>
          ) : isWarehouse ? (
            <>
              <button
                type="button"
                className="btn btn--primary font-semibold"
                onClick={() => navigate('/inventory')}
              >
                📑 Cấp phát linh kiện {counts.waitingParts > 0 ? `(${counts.waitingParts})` : ''}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate('/inventory')}
              >
                ⇄ Nhập / Xuất kho vật tư
              </button>
            </>
          ) : isTechnician ? (
            <>
              <button
                type="button"
                className="btn btn--primary font-semibold"
                onClick={() => navigate('/repairs')}
              >
                🔧 Phiếu tôi phụ trách {counts.assigned + counts.inProgress > 0 ? `(${counts.assigned + counts.inProgress})` : ''}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate('/inventory')}
              >
                📦 Yêu cầu linh kiện kho
              </button>
            </>
          ) : isReceptionist ? (
            <>
              <button
                type="button"
                className="btn btn--primary font-semibold"
                onClick={() => navigate('/repairs/new')}
              >
                + Tiếp nhận máy mới
              </button>
              <button
                type="button"
                className="btn btn--outline font-semibold"
                onClick={() => navigate('/repairs')}
              >
                📥 Chờ duyệt {counts.pending > 0 ? `(${counts.pending})` : ''}
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => navigate('/customers')}
              >
                👥 Khách hàng
              </button>
            </>
          ) : (
            // Admin & Manager
            <>
              {canManageUsers && (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => navigate('/users')}
                >
                  👔 Quản lý Nhân sự
                </button>
              )}
              <button
                type="button"
                className="btn btn--primary font-semibold"
                onClick={() => navigate('/repairs')}
              >
                ⚖️ Báo giá chờ duyệt {counts.awaitingAdmin > 0 ? `(${counts.awaitingAdmin})` : ''}
              </button>
              {canReports && (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => navigate('/reports')}
                >
                  📊 Báo cáo Toàn diện
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Đang tải dữ liệu tổng quan theo vai trò..." />
      ) : (
        <>
          {/* Actionable Alert Banners by Role */}
          {/* 1. Lễ tân Alert */}
          {isReceptionist && counts.pending > 0 && (
            <div
              className="card p-3 mb-4 d-flex justify-content-between align-items-center"
              style={{ background: '#fffbeb', borderColor: '#fde68a' }}
            >
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '1.6rem' }} aria-hidden="true">🔔</span>
                <div>
                  <strong style={{ color: '#92400e', fontSize: '1rem' }}>
                    Có {counts.pending} yêu cầu sửa chữa mới đang chờ Lễ tân tiếp nhận (Giai đoạn 1)!
                  </strong>
                  <div className="text-sm text-muted">
                    Vui lòng kiểm tra thông tin, bấm Chấp nhận (ACCEPTED) hoặc Từ chối (REJECTED có lý do).
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/repairs')}
              >
                Tiếp nhận ngay ➔
              </button>
            </div>
          )}

          {/* 2. Admin Alert */}
          {isAdmin && counts.awaitingAdmin > 0 && (
            <div
              className="card p-3 mb-4 d-flex justify-content-between align-items-center"
              style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}
            >
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '1.6rem' }} aria-hidden="true">⚖️</span>
                <div>
                  <strong style={{ color: '#1e40af', fontSize: '1rem' }}>
                    Có {counts.awaitingAdmin} báo giá của KTV đang chờ Admin thẩm định & duyệt (Giai đoạn 5)!
                  </strong>
                  <div className="text-sm text-muted">
                    Kiểm tra chi phí nhân công và linh kiện trước khi hệ thống chuyển tiếp cho Khách hàng phê duyệt.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/repairs')}
              >
                Thẩm định ngay ➔
              </button>
            </div>
          )}

          {/* 3. Kế toán Alert */}
          {isAccountant && counts.completed > 0 && (
            <div
              className="card p-3 mb-4 d-flex justify-content-between align-items-center"
              style={{ background: '#ecfdf5', borderColor: '#a7f3d0' }}
            >
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '1.6rem' }} aria-hidden="true">💳</span>
                <div>
                  <strong style={{ color: '#065f46', fontSize: '1rem' }}>
                    Có {counts.completed} phiếu đã hoàn thành kỹ thuật đang chờ Kế toán lập hóa đơn & thu tiền (Giai đoạn 10)!
                  </strong>
                  <div className="text-sm text-muted">
                    Kiểm tra tổng chi phí đã được khách duyệt, xuất hóa đơn INV và ghi nhận thanh toán để chuyển sang PAID.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/repairs')}
              >
                Lập hóa đơn & Thu tiền ➔
              </button>
            </div>
          )}

          {/* 4. Thủ kho Alert */}
          {isWarehouse && counts.waitingParts > 0 && (
            <div
              className="card p-3 mb-4 d-flex justify-content-between align-items-center"
              style={{ background: '#fff7ed', borderColor: '#fed7aa' }}
            >
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '1.6rem' }} aria-hidden="true">📦</span>
                <div>
                  <strong style={{ color: '#9a3412', fontSize: '1rem' }}>
                    Có {counts.waitingParts} đơn đang tạm dừng chờ Thủ kho cấp phát linh kiện (Giai đoạn 8)!
                  </strong>
                  <div className="text-sm text-muted">
                    Kiểm tra tồn kho, phê duyệt và xuất kho linh kiện để KTV tiếp tục sửa chữa.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/inventory')}
              >
                Cấp phát ngay ➔
              </button>
            </div>
          )}

          {/* 5. Kỹ thuật viên Alert */}
          {isTechnician && counts.assigned > 0 && (
            <div
              className="card p-3 mb-4 d-flex justify-content-between align-items-center"
              style={{ background: '#f5f3ff', borderColor: '#ddd6fe' }}
            >
              <div className="d-flex align-items-center gap-3">
                <span style={{ fontSize: '1.6rem' }} aria-hidden="true">🔧</span>
                <div>
                  <strong style={{ color: '#5b21b6', fontSize: '1rem' }}>
                    Bạn có {counts.assigned} phiếu sửa chữa mới được phân công đang chờ chẩn đoán & lập báo giá!
                  </strong>
                  <div className="text-sm text-muted">
                    Kiểm tra máy móc, chẩn đoán nguyên nhân hư hỏng và lập báo giá chi tiết gửi Admin duyệt.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => navigate('/repairs')}
              >
                Chẩn đoán ngay ➔
              </button>
            </div>
          )}

          {/* Key Metrics KPI Grid tailored by Role */}
          <div className="dashboard-kpi-grid">
            {isAccountant ? (
              <>
                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--blue">💳</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Phiếu chờ thu tiền (GĐ 9)</span>
                    <div className="kpi-card__value text-primary">{counts.completed}</div>
                    <small className="kpi-card__subtext text-primary">Sửa xong, chờ xuất HĐ ➔</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/reports')}>
                  <div className="kpi-card__icon kpi-card__icon--green">💰</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Thực thu quỹ</span>
                    <div className="kpi-card__value text-success">
                      {summary ? formatCurrency(summary.financials.totalCollected) : '0 ₫'}
                    </div>
                    <small className="kpi-card__subtext text-muted">Đã ghi nhận vào quỹ</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/reports')}>
                  <div className="kpi-card__icon kpi-card__icon--red">📉</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Công nợ còn thiếu</span>
                    <div className="kpi-card__value text-danger">
                      {summary ? formatCurrency(summary.financials.balanceDue) : '0 ₫'}
                    </div>
                    <small className="kpi-card__subtext text-muted">Chưa thanh toán đủ</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--purple">✅</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Đã thanh toán đủ (GĐ 10)</span>
                    <div className="kpi-card__value text-success">{counts.paid}</div>
                    <small className="kpi-card__subtext text-muted">Sẵn sàng bàn giao khách</small>
                  </div>
                </div>
              </>
            ) : isReceptionist ? (
              <>
                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--orange">🔔</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Chờ tiếp nhận (GĐ 1)</span>
                    <div className="kpi-card__value text-warning">{counts.pending}</div>
                    <small className="kpi-card__subtext text-primary">Cần duyệt hoặc từ chối ➔</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--blue">📥</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Đã nhận chờ KTV (GĐ 2)</span>
                    <div className="kpi-card__value text-info">{counts.accepted}</div>
                    <small className="kpi-card__subtext text-muted">Chờ Admin phân công KTV</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--green">🚚</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Đã thanh toán xong (GĐ 10)</span>
                    <div className="kpi-card__value text-success">{counts.paid}</div>
                    <small className="kpi-card__subtext text-success">Sẵn sàng bàn giao khách ➔</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/customers')}>
                  <div className="kpi-card__icon kpi-card__icon--purple">👥</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Khách hàng & Thiết bị</span>
                    <div className="kpi-card__value">{summary ? summary.repairOrders.total : counts.total}</div>
                    <small className="kpi-card__subtext text-primary">Tra cứu hồ sơ khách ➔</small>
                  </div>
                </div>
              </>
            ) : isTechnician ? (
              <>
                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--blue">👔</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Phân công / Chẩn đoán (GĐ 3-4)</span>
                    <div className="kpi-card__value text-primary">{counts.assigned}</div>
                    <small className="kpi-card__subtext text-primary">Cần lập báo giá ➔</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--orange">🔧</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Đang sửa chữa (GĐ 7)</span>
                    <div className="kpi-card__value text-warning">{counts.inProgress}</div>
                    <small className="kpi-card__subtext text-muted">Ghi nhật ký & hình ảnh</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--red">📦</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Chờ linh kiện kho (GĐ 8)</span>
                    <div className="kpi-card__value text-danger">{counts.waitingParts}</div>
                    <small className="kpi-card__subtext text-muted">Đang chờ thủ kho cấp</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--green">✅</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Đã hoàn thành sửa (GĐ 9)</span>
                    <div className="kpi-card__value text-success">{counts.completed}</div>
                    <small className="kpi-card__subtext text-muted">Đã chuyển sang Kế toán</small>
                  </div>
                </div>
              </>
            ) : isWarehouse ? (
              <>
                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/inventory')}>
                  <div className="kpi-card__icon kpi-card__icon--orange">📦</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Yêu cầu cấp phát chờ duyệt (GĐ 8)</span>
                    <div className="kpi-card__value text-warning">{counts.waitingParts}</div>
                    <small className="kpi-card__subtext text-primary">Duyệt & xuất kho ngay ➔</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/inventory')}>
                  <div className="kpi-card__icon kpi-card__icon--red">⚠️</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Cảnh báo tồn kho thấp</span>
                    <div
                      className={`kpi-card__value ${
                        summary && summary.inventory.lowStockItems > 0 ? 'text-danger' : 'text-success'
                      }`}
                    >
                      {summary ? summary.inventory.lowStockItems : 0} mặt hàng
                    </div>
                    <small className="kpi-card__subtext text-muted">Dưới mức tối thiểu</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--blue">🔧</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Đơn đang sửa chữa (GĐ 7)</span>
                    <div className="kpi-card__value text-info">{counts.inProgress}</div>
                    <small className="kpi-card__subtext text-muted">Theo dõi nhu cầu linh kiện</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/inventory')}>
                  <div className="kpi-card__icon kpi-card__icon--green">⇄</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Quản lý Kho & Nhập xuất</span>
                    <div className="kpi-card__value text-success">Hoạt động</div>
                    <small className="kpi-card__subtext text-primary">Xem sổ biến động kho ➔</small>
                  </div>
                </div>
              </>
            ) : (
              // Admin & Manager
              <>
                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--blue">🔧</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Tổng số phiếu sửa chữa</span>
                    <div className="kpi-card__value">
                      {summary ? summary.repairOrders.total : counts.total}
                    </div>
                    <small className="kpi-card__subtext text-primary">Xem tất cả phiếu ➔</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/repairs')}>
                  <div className="kpi-card__icon kpi-card__icon--purple">⚖️</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Báo giá chờ Admin duyệt (GĐ 5)</span>
                    <div className="kpi-card__value text-primary">{counts.awaitingAdmin}</div>
                    <small className="kpi-card__subtext text-primary">Thẩm định chi phí ➔</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/reports')}>
                  <div className="kpi-card__icon kpi-card__icon--green">💰</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Thực thu quỹ</span>
                    <div className="kpi-card__value text-success">
                      {summary ? formatCurrency(summary.financials.totalCollected) : '0 ₫'}
                    </div>
                    <small className="kpi-card__subtext text-muted">Từ các đợt thanh toán</small>
                  </div>
                </div>

                <div className="kpi-card" role="button" tabIndex={0} onClick={() => navigate('/inventory')}>
                  <div className="kpi-card__icon kpi-card__icon--orange">📦</div>
                  <div className="kpi-card__info">
                    <span className="kpi-card__label">Cảnh báo tồn kho</span>
                    <div
                      className={`kpi-card__value ${
                        summary && summary.inventory.lowStockItems > 0 ? 'text-warning' : 'text-success'
                      }`}
                    >
                      {summary ? summary.inventory.lowStockItems : 0} mặt hàng
                    </div>
                    <small className="kpi-card__subtext text-muted">Dưới mức tối thiểu</small>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Quick Shortcuts & Recent Orders Grid */}
          <div className="dashboard-two-cols">
            {/* Left: Recent Repair Orders */}
            <div className="card dashboard-recent-orders">
              <div className="section-header">
                <h3 className="card__title">Phiếu sửa chữa gần đây</h3>
                <button
                  type="button"
                  className="link-btn font-semibold"
                  onClick={() => navigate('/repairs')}
                >
                  Xem tất cả ➔
                </button>
              </div>

              {recentOrders.length === 0 ? (
                <p className="text-muted text-sm py-4">Chưa có phiếu sửa chữa nào trong hệ thống.</p>
              ) : (
                <div className="recent-orders-list">
                  {recentOrders.map((ro) => {
                    const st = getRepairStatusInfo(ro.repairStatus);
                    return (
                      <div
                        key={ro.id}
                        className="recent-order-item"
                        onClick={() => navigate(`/repairs/${ro.id}`)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="recent-order-item__main">
                          <span className="order-code">{ro.code}</span>
                          <span className={`badge ${st.className}`}>{st.label}</span>
                          <div className="recent-order-item__desc text-truncate-2">
                            {ro.reportedIssue}
                          </div>
                        </div>
                        <div className="recent-order-item__meta">
                          <small className="text-muted">{formatDate(ro.receivedAt)}</small>
                          <span className="text-sm font-semibold text-primary">Xem chi tiết ➔</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Specialized Shortcuts by Role */}
            <div className="dashboard-shortcuts-panel">
              <div className="card">
                <h3 className="card__title mb-3">Lối tắt thao tác nhanh</h3>
                <div className="shortcuts-list">
                  {isAccountant ? (
                    <>
                      <div className="shortcut-item" onClick={() => navigate('/repairs')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">💳</span>
                        <div>
                          <strong>Thu tiền & Lập hóa đơn</strong>
                          <p className="text-sm text-muted">Tiếp nhận phiếu COMPLETED, lập hóa đơn INV và thu tiền</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/reports')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">📊</span>
                        <div>
                          <strong>Báo cáo Doanh thu & Sổ quỹ</strong>
                          <p className="text-sm text-muted">Thống kê giao dịch thu tiền mặt, chuyển khoản và công nợ</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/repairs')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">📄</span>
                        <div>
                          <strong>Danh sách phiếu đã thanh toán (PAID)</strong>
                          <p className="text-sm text-muted">Tra cứu lịch sử biên lai và trạng thái thanh toán 100%</p>
                        </div>
                      </div>
                    </>
                  ) : isWarehouse ? (
                    <>
                      <div className="shortcut-item" onClick={() => navigate('/inventory')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">📑</span>
                        <div>
                          <strong>Duyệt Cấp phát linh kiện</strong>
                          <p className="text-sm text-muted">Xem yêu cầu từ KTV, kiểm tra tồn và xuất kho nguyên tử</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/inventory')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">📦</span>
                        <div>
                          <strong>Quản lý Danh mục & Tồn kho</strong>
                          <p className="text-sm text-muted">Theo dõi mức tồn tối thiểu, cảnh báo thiếu hàng</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/inventory')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">⇄</span>
                        <div>
                          <strong>Nhập kho / Điều chỉnh kho</strong>
                          <p className="text-sm text-muted">Lập phiếu nhập linh kiện mới và cân chỉnh số lượng</p>
                        </div>
                      </div>
                    </>
                  ) : isTechnician ? (
                    <>
                      <div className="shortcut-item" onClick={() => navigate('/repairs')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">🔧</span>
                        <div>
                          <strong>Phiếu sửa chữa được phân công</strong>
                          <p className="text-sm text-muted">Chẩn đoán lỗi, đề xuất phương án và lập báo giá</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/inventory')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">📦</span>
                        <div>
                          <strong>Yêu cầu linh kiện từ kho</strong>
                          <p className="text-sm text-muted">Gửi yêu cầu xuất linh kiện cho Thủ kho xử lý</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/repairs')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">📝</span>
                        <div>
                          <strong>Nhật ký sửa chữa & Ảnh</strong>
                          <p className="text-sm text-muted">Cập nhật tiến trình công việc, ảnh trước và sau sửa chữa</p>
                        </div>
                      </div>
                    </>
                  ) : isReceptionist ? (
                    <>
                      <div className="shortcut-item" onClick={() => navigate('/repairs/new')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">➕</span>
                        <div>
                          <strong>Tiếp nhận máy mới tại quầy</strong>
                          <p className="text-sm text-muted">Thêm nhanh khách hàng, thiết bị và tạo đơn sửa chữa</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/repairs')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">🔔</span>
                        <div>
                          <strong>Xử lý đơn trực tuyến (PENDING)</strong>
                          <p className="text-sm text-muted">Chấp nhận hoặc từ chối kèm lý do rõ ràng</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/customers')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">👥</span>
                        <div>
                          <strong>Quản lý Khách hàng & Thiết bị</strong>
                          <p className="text-sm text-muted">Tra cứu số điện thoại, địa chỉ và lịch sử sửa chữa</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/repairs')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">🚚</span>
                        <div>
                          <strong>Bàn giao thiết bị cho khách</strong>
                          <p className="text-sm text-muted">Bàn giao máy sau khi đã thanh toán hoàn tất (PAID)</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // Admin & Manager
                    <>
                      {canManageUsers && (
                        <div className="shortcut-item" onClick={() => navigate('/users')} role="button" tabIndex={0}>
                          <span className="shortcut-item__icon">👔</span>
                          <div>
                            <strong>Quản lý Nhân sự & Phân quyền</strong>
                            <p className="text-sm text-muted">Quản trị 6 vai trò, cấp tài khoản và theo dõi KTV</p>
                          </div>
                        </div>
                      )}

                      <div className="shortcut-item" onClick={() => navigate('/repairs')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">⚖️</span>
                        <div>
                          <strong>Phê duyệt Báo giá & Phân công</strong>
                          <p className="text-sm text-muted">Thẩm định báo giá KTV và phân công đơn cho thợ</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/customers')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">👥</span>
                        <div>
                          <strong>Quản lý Khách hàng</strong>
                          <p className="text-sm text-muted">Hồ sơ khách hàng, phân quyền tài khoản Cổng dịch vụ</p>
                        </div>
                      </div>

                      <div className="shortcut-item" onClick={() => navigate('/inventory')} role="button" tabIndex={0}>
                        <span className="shortcut-item__icon">📦</span>
                        <div>
                          <strong>Quản lý Kho & Vật tư</strong>
                          <p className="text-sm text-muted">Kiểm kê tồn kho, xuất nhập linh kiện chi nhánh</p>
                        </div>
                      </div>

                      {canReports && (
                        <div className="shortcut-item" onClick={() => navigate('/reports')} role="button" tabIndex={0}>
                          <span className="shortcut-item__icon">📊</span>
                          <div>
                            <strong>Báo cáo Vận hành & Doanh thu</strong>
                            <p className="text-sm text-muted">KPI doanh thu, công nợ, hiệu suất sửa chữa</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* System status info */}
              <div className="system-status-card">
                <div className="system-status-indicator">
                  <span className="status-dot"></span>
                  <span>Hệ thống 6 Roles & 10 Giai đoạn: <strong>Sẵn sàng</strong></span>
                </div>
                <small className="text-muted">Phiên bản: 2.0.0-standard</small>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
