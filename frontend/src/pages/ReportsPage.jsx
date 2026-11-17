import { useEffect, useState } from 'react';
import { getAllPayments, getAllWarranties, getReportsSummary } from '../api/reports.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate, getRepairStatusInfo } from '../utils/formatters.js';

export default function ReportsPage() {
  const { hasPermission, roles = [] } = useAuth();
  const canViewReports =
    (hasPermission && (hasPermission('reports.view') || hasPermission('operations.manage') || hasPermission('system.manage'))) ||
    roles.includes('ADMIN') ||
    roles.includes('MANAGER');

  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [warranties, setWarranties] = useState([]);

  const [paymentFilterMethod, setPaymentFilterMethod] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getReportsSummary();
    if (res.error) {
      setError(res.error);
    } else {
      setSummary(res.data);
    }
    setIsLoading(false);
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    setError(null);
    const params = {};
    if (paymentFilterMethod) params.paymentMethod = paymentFilterMethod;
    const res = await getAllPayments(params);
    if (res.error) {
      setError(res.error);
    } else {
      setPayments(res.data.items || []);
    }
    setIsLoading(false);
  };

  const fetchWarranties = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getAllWarranties();
    if (res.error) {
      setError(res.error);
    } else {
      setWarranties(res.data.items || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'summary') fetchSummary();
    else if (activeTab === 'payments') fetchPayments();
    else if (activeTab === 'warranties') fetchWarranties();
  }, [activeTab, paymentFilterMethod]);

  if (!canViewReports) {
    return (
      <div className="page">
        <EmptyState
          title="Không có quyền truy cập"
          message="Bạn không có quyền xem báo cáo và số liệu vận hành của hệ thống."
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page__header page__header--actions">
        <div>
          <h1 className="page__title">Báo cáo Vận hành & Doanh thu</h1>
          <p className="page__subtitle">
            Tổng hợp dữ liệu kinh doanh, dòng tiền thanh toán, phân bố trạng thái phiếu và tình hình bảo hành
          </p>
        </div>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => {
            if (activeTab === 'summary') fetchSummary();
            else if (activeTab === 'payments') fetchPayments();
            else if (activeTab === 'warranties') fetchWarranties();
          }}
        >
          🔄 Làm mới dữ liệu
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs-header">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'summary' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          📈 Tổng quan số liệu
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'payments' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💵 Dòng tiền & Thanh toán
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'warranties' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('warranties')}
        >
          🛡️ Thống kê Bảo hành
        </button>
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'summary' && (
        <div>
          {isLoading ? (
            <LoadingSpinner message="Đang tính toán số liệu thống kê..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchSummary} />
          ) : summary ? (
            <div>
              {/* Top KPI Cards */}
              <div className="dashboard-cards">
                <div className="card stat-card">
                  <div className="stat-card__icon" style={{ background: '#e6f4ea', color: '#1e8e3e' }}>
                    💰
                  </div>
                  <div>
                    <span className="stat-card__label">Tổng thực thu</span>
                    <h3 className="stat-card__value text-success">
                      {formatCurrency(summary.financials.totalCollected)}
                    </h3>
                    <small className="text-muted">
                      Từ {summary.financials.totalTransactions} giao dịch thành công
                    </small>
                  </div>
                </div>

                <div className="card stat-card">
                  <div className="stat-card__icon" style={{ background: '#fce8e6', color: '#d93025' }}>
                    📉
                  </div>
                  <div>
                    <span className="stat-card__label">Công nợ còn phải thu</span>
                    <h3 className="stat-card__value text-danger">
                      {formatCurrency(summary.financials.balanceDue)}
                    </h3>
                    <small className="text-muted">
                      Tổng chi phí: {formatCurrency(summary.financials.totalReceivable)}
                    </small>
                  </div>
                </div>

                <div className="card stat-card">
                  <div className="stat-card__icon" style={{ background: '#e8f0fe', color: '#1a73e8' }}>
                    📋
                  </div>
                  <div>
                    <span className="stat-card__label">Tổng phiếu sửa chữa</span>
                    <h3 className="stat-card__value text-primary">{summary.repairOrders.total}</h3>
                    <small className="text-muted">Lịch sử tiếp nhận toàn hệ thống</small>
                  </div>
                </div>

                <div className="card stat-card">
                  <div
                    className="stat-card__icon"
                    style={{
                      background: summary.inventory.lowStockItems > 0 ? '#fef3cd' : '#e6f4ea',
                      color: summary.inventory.lowStockItems > 0 ? '#856404' : '#1e8e3e',
                    }}
                  >
                    📦
                  </div>
                  <div>
                    <span className="stat-card__label">Cảnh báo tồn kho</span>
                    <h3
                      className={`stat-card__value ${
                        summary.inventory.lowStockItems > 0 ? 'text-warning' : 'text-success'
                      }`}
                    >
                      {summary.inventory.lowStockItems} mặt hàng
                    </h3>
                    <small className="text-muted">
                      Trên tổng số {summary.inventory.totalItems} mặt hàng
                    </small>
                  </div>
                </div>
              </div>

              {/* Status breakdown */}
              <div className="card mt-4">
                <h3 className="card__title">Phân bố phiếu sửa chữa theo trạng thái</h3>
                <div className="status-grid mt-3">
                  {Object.entries(summary.repairOrders.byStatus).map(([statusKey, count]) => {
                    const statusInfo = getRepairStatusInfo(statusKey);
                    const pct =
                      summary.repairOrders.total > 0
                        ? Math.round((count / summary.repairOrders.total) * 100)
                        : 0;
                    return (
                      <div key={statusKey} className="status-progress-box">
                        <div className="status-progress-header">
                          <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
                          <span className="font-semibold">
                            {count} phiếu ({pct}%)
                          </span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warranty highlights */}
              <div className="card mt-4">
                <h3 className="card__title">Chỉ số bảo hành sau sửa chữa</h3>
                <div className="warranty-metrics-strip mt-3">
                  <div className="warranty-metric-item">
                    <span className="text-muted">Tổng thẻ bảo hành đã cấp:</span>
                    <strong>{summary.warranty.totalWarranties}</strong>
                  </div>
                  <div className="warranty-metric-item">
                    <span className="text-muted">Thẻ bảo hành đang có hiệu lực:</span>
                    <strong className="text-success">{summary.warranty.activeWarranties}</strong>
                  </div>
                  <div className="warranty-metric-item">
                    <span className="text-muted">Số lượt máy bảo hành lại (claims):</span>
                    <strong className="text-warning">{summary.warranty.totalClaims}</strong>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 2: PAYMENTS */}
      {activeTab === 'payments' && (
        <div>
          <div className="filter-bar">
            <div className="filter-bar__search">
              <select
                className="form-control"
                value={paymentFilterMethod}
                onChange={(e) => setPaymentFilterMethod(e.target.value)}
              >
                <option value="">Tất cả hình thức thanh toán</option>
                <option value="CASH">Tiền mặt (CASH)</option>
                <option value="BANK_TRANSFER">Chuyển khoản (BANK_TRANSFER)</option>
                <option value="CARD">Quẹt thẻ (CARD)</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Đang tải danh sách thanh toán..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchPayments} />
          ) : payments.length === 0 ? (
            <EmptyState
              title="Chưa có dữ liệu thanh toán"
              message="Chưa có giao dịch thu tiền nào phù hợp với bộ lọc."
            />
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Mã phiếu</th>
                    <th>Khách hàng</th>
                    <th className="text-right">Số tiền</th>
                    <th>Hình thức</th>
                    <th>Trạng thái</th>
                    <th>Người thu</th>
                    <th>Thời gian</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className={p.voidedAt ? 'row--dimmed' : ''}>
                      <td>#{p.id}</td>
                      <td>
                        <strong className="order-code">{p.repairOrderCode}</strong>
                      </td>
                      <td>
                        <div className="font-semibold">{p.customerName}</div>
                        <small className="text-muted">{p.customerPhone}</small>
                      </td>
                      <td className="text-right font-semibold text-success">
                        {formatCurrency(p.amount)}
                      </td>
                      <td>
                        <span className="badge badge--neutral">{p.paymentMethod}</span>
                      </td>
                      <td>
                        {p.voidedAt ? (
                          <span className="badge badge--danger" title={`Lý do: ${p.voidReason}`}>
                            Đã hủy
                          </span>
                        ) : (
                          <span className="badge badge--success">Thành công</span>
                        )}
                      </td>
                      <td>{p.receivedByName}</td>
                      <td>
                        <small>{formatDate(p.receivedAt)}</small>
                      </td>
                      <td>{p.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: WARRANTIES */}
      {activeTab === 'warranties' && (
        <div>
          {isLoading ? (
            <LoadingSpinner message="Đang tải dữ liệu thẻ bảo hành..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={fetchWarranties} />
          ) : warranties.length === 0 ? (
            <EmptyState
              title="Chưa có thẻ bảo hành"
              message="Chưa có phiếu bảo hành nào được cấp trong hệ thống."
            />
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã thẻ BH</th>
                    <th>Mã phiếu</th>
                    <th>Khách hàng</th>
                    <th>Thiết bị</th>
                    <th>Loại BH</th>
                    <th>Thời hạn</th>
                    <th>Bắt đầu</th>
                    <th>Hết hạn</th>
                    <th>Hiệu lực</th>
                  </tr>
                </thead>
                <tbody>
                  {warranties.map((w) => (
                    <tr key={w.id}>
                      <td>
                        <code className="font-semibold text-primary">{w.warrantyCode}</code>
                      </td>
                      <td>
                        <strong>{w.repairOrderCode}</strong>
                      </td>
                      <td>
                        <div>{w.customerName}</div>
                        <small className="text-muted">{w.customerPhone}</small>
                      </td>
                      <td>
                        <div>{w.deviceType}</div>
                        <small className="text-muted">
                          {w.brand} {w.model}
                        </small>
                      </td>
                      <td>
                        <span className="badge badge--info">{w.warrantyType}</span>
                      </td>
                      <td>{w.durationDays} ngày</td>
                      <td>
                        <small>{formatDate(w.startsAt)}</small>
                      </td>
                      <td>
                        <small>{formatDate(w.endsAt)}</small>
                      </td>
                      <td>
                        <span className={`badge ${w.isActive ? 'badge--success' : 'badge--neutral'}`}>
                          {w.isActive ? 'Đang hiệu lực' : 'Đã hết hạn'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

