import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRepairOrders, transitionStatus } from '../api/repairs.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatDate, getRepairStatusInfo, REPAIR_STATUS_MAP } from '../utils/formatters.js';

export default function RepairsListPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManageIntake = hasPermission ? hasPermission('intake.manage') : false;

  const [repairs, setRepairs] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);
  const [quickSuccess, setQuickSuccess] = useState(null);

  // Modal Từ chối đơn (Giai đoạn 2: Lễ tân từ chối kèm lý do bắt buộc)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectOrder, setRejectOrder] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState(null);

  const fetchRepairs = async () => {
    setIsLoading(true);
    setError(null);
    const params = {};
    if (selectedStatus) params.repairStatus = selectedStatus;
    if (search) params.search = search;
    const res = await getRepairOrders(params);
    if (res.error) {
      setError(res.error);
    } else {
      setRepairs(res.data.items || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRepairs();
  }, [selectedStatus, search]);

  const handleAccept = async (e, orderId) => {
    e.stopPropagation();
    setProcessingId(orderId);
    const res = await transitionStatus(orderId, {
      toStatus: 'ACCEPTED',
      reason: 'Lễ tân chấp nhận đơn sửa chữa',
    });
    setProcessingId(null);
    if (res.error) {
      setError(res.error);
    } else {
      setQuickSuccess(`Đã chấp nhận đơn #${orderId}! Đơn chuyển sang trạng thái chờ Admin phân công.`);
      setTimeout(() => setQuickSuccess(null), 4000);
      fetchRepairs();
    }
  };

  const handleOpenReject = (e, order) => {
    e.stopPropagation();
    setRejectOrder(order);
    setRejectReason('');
    setRejectError(null);
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      setRejectError('Bắt buộc ghi lý do khi từ chối đơn sửa chữa.');
      return;
    }
    if (!rejectOrder) return;
    setProcessingId(rejectOrder.id);
    const res = await transitionStatus(rejectOrder.id, {
      toStatus: 'REJECTED',
      reason: rejectReason.trim(),
    });
    setProcessingId(null);
    if (res.error) {
      setRejectError(res.error);
    } else {
      setShowRejectModal(false);
      setQuickSuccess(`Đã từ chối đơn #${rejectOrder.id} kèm lý do: "${rejectReason.trim()}".`);
      setTimeout(() => setQuickSuccess(null), 4000);
      fetchRepairs();
    }
  };

  const pendingCount = repairs.filter((r) => r.repairStatus === 'PENDING' || r.repairStatus === 'PENDING_RECEPTION').length;

  return (
    <div className="page">
      <div className="page__header page__header--actions">
        <div>
          <h1 className="page__title">Phiếu sửa chữa</h1>
          <p className="page__subtitle">
            Quy trình tiếp nhận đơn từ khách/lễ tân, điều phối kỹ thuật viên, theo dõi sửa chữa và thanh toán
          </p>
        </div>
        {canManageIntake && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => navigate('/repairs/new')}
          >
            + Tiếp nhận phiếu mới tại quầy
          </button>
        )}
      </div>

      {quickSuccess && (
        <div className="badge badge--success p-3 mb-3 d-block font-semibold">
          ✓ {quickSuccess}
        </div>
      )}

      {/* Quick Status Filter Tabs */}
      <div className="tabs-header mb-3" style={{ flexWrap: 'wrap', gap: '6px' }}>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === '' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('')}
        >
          Tất cả phiếu
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'PENDING' || selectedStatus === 'PENDING_RECEPTION' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('PENDING')}
        >
          🔔 Chờ tiếp nhận (GĐ 1) {pendingCount > 0 ? `(${pendingCount})` : ''}
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'ACCEPTED' || selectedStatus === 'RECEIVED' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('ACCEPTED')}
        >
          📥 Đã tiếp nhận (GĐ 2)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'ASSIGNED' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('ASSIGNED')}
        >
          👔 Đã phân công (GĐ 3)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'AWAITING_ADMIN_APPROVAL' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('AWAITING_ADMIN_APPROVAL')}
        >
          ⚖️ Chờ Admin duyệt giá (GĐ 5)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'AWAITING_CUSTOMER_APPROVAL' || selectedStatus === 'WAITING_APPROVAL' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('AWAITING_CUSTOMER_APPROVAL')}
        >
          ⏳ Chờ khách duyệt giá (GĐ 6)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'IN_PROGRESS' || selectedStatus === 'REPAIRING' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('IN_PROGRESS')}
        >
          🔧 Đang sửa chữa (GĐ 7)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'WAITING_PARTS' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('WAITING_PARTS')}
        >
          📦 Chờ linh kiện (GĐ 8)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'COMPLETED' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('COMPLETED')}
        >
          ✅ Hoàn thành sửa (GĐ 9)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'PAID' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('PAID')}
        >
          💳 Đã thanh toán (GĐ 10)
        </button>
        <button
          type="button"
          className={`tab-btn ${selectedStatus === 'REJECTED' ? 'tab-btn--active' : ''}`}
          onClick={() => setSelectedStatus('REJECTED')}
        >
          ❌ Đã từ chối
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-bar__search">
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo mã phiếu, lỗi, khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-bar__status">
          <select
            className="form-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(REPAIR_STATUS_MAP).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Đang tải danh sách phiếu sửa chữa..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchRepairs} />
      ) : repairs.length === 0 ? (
        <EmptyState
          title="Không tìm thấy phiếu sửa chữa nào"
          message={
            selectedStatus || search
              ? 'Không có phiếu sửa chữa nào khớp với bộ lọc hiện tại.'
              : 'Chưa có phiếu sửa chữa nào trong hệ thống.'
          }
          action={
            canManageIntake && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => navigate('/repairs/new')}
              >
                Tiếp nhận phiếu đầu tiên
              </button>
            )
          }
        />
      ) : (
        <div className="card table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Khách hàng & Thiết bị</th>
                <th>Hiện trạng / Lỗi báo</th>
                <th>KTV phụ trách</th>
                <th>Trạng thái</th>
                <th>Ngày tiếp nhận</th>
                <th>Hẹn trả</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {repairs.map((r) => {
                const statusInfo = getRepairStatusInfo(r.repairStatus);
                const isPending = r.repairStatus === 'PENDING' || r.repairStatus === 'PENDING_RECEPTION';
                return (
                  <tr
                    key={r.id}
                    className="table-row--clickable"
                    onClick={() => navigate(`/repairs/${r.id}`)}
                  >
                    <td>
                      <span className="order-code">{r.code}</span>
                      {r.originalRepairOrderId && (
                        <span className="badge badge--warning ml-1" title="Bảo hành lại">
                          Bảo hành
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="font-semibold">{r.customerName || `KH #${r.customerId}`}</div>
                      <div className="text-muted text-sm">{r.deviceInfo || `TB #${r.deviceId}`}</div>
                    </td>
                    <td>
                      <div className="text-truncate-2" title={r.reportedIssue}>
                        {r.reportedIssue}
                      </div>
                    </td>
                    <td>
                      {r.assignedTechnicianName ? (
                        <span className="tech-badge">{r.assignedTechnicianName}</span>
                      ) : (
                        <span className="text-muted text-sm">Chưa phân công</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td>
                      <small>{formatDate(r.receivedAt || r.createdAt)}</small>
                    </td>
                    <td>
                      <small>{formatDate(r.promisedAt)}</small>
                    </td>
                    <td className="text-right" style={{ whiteSpace: 'nowrap' }}>
                      {isPending && canManageIntake ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--primary btn--sm mr-1 font-semibold"
                            disabled={processingId === r.id}
                            onClick={(e) => handleAccept(e, r.id)}
                          >
                            {processingId === r.id ? 'Đang duyệt...' : '✅ Chấp nhận'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--outline-danger btn--sm mr-2"
                            disabled={processingId === r.id}
                            onClick={(e) => handleOpenReject(e, r)}
                          >
                            ❌ Từ chối
                          </button>
                        </>
                      ) : (r.repairStatus === 'ACCEPTED' || r.repairStatus === 'RECEIVED') ? (
                        <button
                          type="button"
                          className="btn btn--outline btn--sm mr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/repairs/${r.id}`);
                          }}
                        >
                          👔 Phân công
                        </button>
                      ) : (r.repairStatus === 'COMPLETED' || r.repairStatus === 'WAITING_PAYMENT') ? (
                        <button
                          type="button"
                          className="btn btn--success btn--sm mr-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/repairs/${r.id}`);
                          }}
                        >
                          💳 Thu tiền
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/repairs/${r.id}`);
                        }}
                      >
                        Chi tiết ➔
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: LỄ TÂN TỪ CHỐI TIẾP NHẬN ĐƠN (GIAI ĐOẠN 2) */}
      {showRejectModal && rejectOrder && (
        <div className="modal-backdrop">
          <div className="modal card" style={{ maxWidth: '500px' }}>
            <div className="modal__header">
              <h3 className="modal__title text-danger">Từ chối tiếp nhận đơn #{rejectOrder.code}</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectOrder(null);
                }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleConfirmReject}>
              <div className="modal__body">
                <p className="text-muted text-sm mb-3">
                  Theo quy định nghiệp vụ, khi từ chối đơn sửa chữa <strong>bắt buộc phải ghi rõ lý do</strong> để thông báo cho khách hàng:
                </p>
                {rejectError && <div className="alert alert--danger mb-3 p-2 text-sm">{rejectError}</div>}
                <div className="form-group">
                  <label className="form-label" htmlFor="reception-reject-reason">
                    Lý do từ chối đơn sửa chữa <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="reception-reject-reason"
                    className="form-input"
                    rows={3}
                    required
                    placeholder="Ví dụ: Thiết bị đời quá cũ không còn linh kiện thay thế, ngoài phạm vi phục vụ, thông tin thiết bị không chính xác..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectOrder(null);
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--danger font-semibold"
                  disabled={processingId === rejectOrder.id}
                >
                  {processingId === rejectOrder.id ? 'Đang xử lý...' : 'Xác nhận từ chối đơn'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

