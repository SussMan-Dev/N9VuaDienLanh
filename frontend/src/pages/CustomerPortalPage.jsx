import { useEffect, useState } from 'react';
import {
  getCustomerOrders,
  getCustomerOrderDetail,
  createCustomerRequest,
  getCustomerDevices,
  createCustomerDevice,
  getCustomerDeviceTypes,
  decideCustomerQuote,
} from '../api/customer-portal.js';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { formatCurrency, formatDate, getRepairStatusInfo, getQuoteStatusInfo } from '../utils/formatters.js';

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState('devices'); // 'devices' | 'orders' | 'types'
  const [orders, setOrders] = useState([]);
  const [devices, setDevices] = useState([]);
  const [deviceTypes, setDeviceTypes] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [deviceFilter, setDeviceFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Modal / Quote Decision states
  const [decidingQuoteId, setDecidingQuoteId] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingQuote, setRejectingQuote] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modal: Create Service Request
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    deviceId: '',
    deviceTypeId: '',
    brand: 'Daikin',
    model: 'Inverter 1.5HP',
    deviceDescription: '',
    issueDescription: '',
    imageUrl: '',
    contactPhone: '',
    addressLine: '',
    preferredDatetime: '',
  });

  // Modal: Add New Device
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceTypeId: '1',
    brand: '',
    model: '',
    serialNumber: '',
    description: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    const [ordersRes, devsRes, typesRes] = await Promise.all([
      getCustomerOrders({ limit: 50 }),
      getCustomerDevices(),
      getCustomerDeviceTypes(),
    ]);

    if (!ordersRes.error && ordersRes.data) {
      setOrders(ordersRes.data.items || []);
    } else if (ordersRes.error) {
      setError(ordersRes.error);
    }

    if (!devsRes.error && devsRes.data) {
      setDevices(devsRes.data || []);
    }

    if (!typesRes.error && typesRes.data) {
      setDeviceTypes(typesRes.data || []);
      if (typesRes.data.length > 0 && !newDeviceForm.deviceTypeId) {
        setNewDeviceForm((prev) => ({ ...prev, deviceTypeId: String(typesRes.data[0].id) }));
      }
    }

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenOrderDetail = async (orderId) => {
    setIsLoading(true);
    const res = await getCustomerOrderDetail(orderId);
    setIsLoading(false);
    if (!res.error && res.data) {
      setSelectedOrder(res.data);
      setActiveTab('orders');
    } else {
      setError(res.error);
    }
  };

  const handleDecideQuote = async (quoteId, decision, note = '') => {
    if (!selectedOrder) return;
    setDecidingQuoteId(quoteId);
    setError(null);
    setActionSuccess(null);
    const res = await decideCustomerQuote(selectedOrder.id, quoteId, { decision, note });
    setDecidingQuoteId(null);
    if (!res.error) {
      setActionSuccess(
        decision === 'APPROVED'
          ? '🎉 Bạn đã duyệt báo giá thành công! Kỹ thuật viên sẽ tiến hành sửa chữa ngay.'
          : 'Đã ghi nhận phản hồi từ chối báo giá. Trung tâm sẽ liên hệ lại với bạn để hỗ trợ phương án phù hợp.'
      );
      setShowRejectModal(false);
      setRejectReason('');
      setRejectingQuote(null);
      await handleOpenOrderDetail(selectedOrder.id);
      const ordersRes = await getCustomerOrders({ limit: 50 });
      if (!ordersRes.error && ordersRes.data) {
        setOrders(ordersRes.data.items || []);
      }
    } else {
      setError(res.error);
    }
  };

  const handleOpenRequestForDevice = (device) => {
    setCreateForm({
      deviceId: String(device.id),
      deviceTypeId: device.typeId ? String(device.typeId) : '',
      brand: device.brand,
      model: device.model,
      deviceDescription: device.description || '',
      issueDescription: '',
      imageUrl: '',
      contactPhone: '',
      addressLine: '',
      preferredDatetime: '',
    });
    setShowCreateModal(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!createForm.issueDescription.trim()) return;

    setIsLoading(true);
    const payload = {
      issueDescription: createForm.issueDescription.trim(),
      contactPhone: createForm.contactPhone.trim() || undefined,
      addressLine: createForm.addressLine.trim() || undefined,
      preferredDatetime: createForm.preferredDatetime || undefined,
      images: createForm.imageUrl.trim() ? [createForm.imageUrl.trim()] : undefined,
    };

    if (createForm.deviceId) {
      payload.deviceId = Number(createForm.deviceId);
    } else {
      payload.deviceTypeId = createForm.deviceTypeId ? Number(createForm.deviceTypeId) : undefined;
      payload.brand = createForm.brand.trim();
      payload.model = createForm.model.trim();
      payload.deviceDescription = createForm.deviceDescription.trim() || undefined;
    }

    const res = await createCustomerRequest(payload);
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setShowCreateModal(false);
      setCreateForm({
        deviceId: '',
        deviceTypeId: '',
        brand: 'Daikin',
        model: 'Inverter 1.5HP',
        deviceDescription: '',
        issueDescription: '',
        imageUrl: '',
        contactPhone: '',
        addressLine: '',
        preferredDatetime: '',
      });
      setActionSuccess('Gửi yêu cầu sửa chữa thành công! Đơn của bạn đang chờ lễ tân tiếp nhận.');
      setTimeout(() => setActionSuccess(null), 5000);
      setActiveTab('orders');
      await loadData();
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    if (!newDeviceForm.brand.trim() || !newDeviceForm.model.trim()) return;

    setIsLoading(true);
    const res = await createCustomerDevice({
      deviceTypeId: Number(newDeviceForm.deviceTypeId),
      brand: newDeviceForm.brand.trim(),
      model: newDeviceForm.model.trim(),
      serialNumber: newDeviceForm.serialNumber.trim() || undefined,
      description: newDeviceForm.description.trim() || undefined,
    });
    setIsLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setShowAddDeviceModal(false);
      setNewDeviceForm({
        deviceTypeId: deviceTypes[0]?.id ? String(deviceTypes[0].id) : '1',
        brand: '',
        model: '',
        serialNumber: '',
        description: '',
      });
      setActionSuccess('Đã thêm thiết bị vào hồ sơ của bạn thành công!');
      setTimeout(() => setActionSuccess(null), 5000);
      await loadData();
    }
  };

  const getDeviceIcon = (typeCode = '', typeName = '') => {
    const code = (typeCode || '').toUpperCase();
    const name = (typeName || '').toLowerCase();
    if (code.includes('AIR') || name.includes('điều hòa') || name.includes('máy lạnh')) return '❄️';
    if (code.includes('REFRIGERATOR') || name.includes('tủ lạnh')) return '🧊';
    if (code.includes('WASHING') || name.includes('máy giặt')) return '🧺';
    if (code.includes('WATER_HEATER') || name.includes('nóng lạnh') || name.includes('nước nóng')) return '♨️';
    if (code.includes('DRYER') || name.includes('sấy')) return '🌬️';
    if (code.includes('DEHUMIDIFIER') || name.includes('hút ẩm')) return '💧';
    return '⚡';
  };

  const filteredDevices = devices.filter((d) => {
    if (!deviceFilter.trim()) return true;
    const term = deviceFilter.toLowerCase();
    return (
      (d.brand && d.brand.toLowerCase().includes(term)) ||
      (d.model && d.model.toLowerCase().includes(term)) ||
      (d.serialNumber && d.serialNumber.toLowerCase().includes(term)) ||
      (d.typeName && d.typeName.toLowerCase().includes(term)) ||
      (d.description && d.description.toLowerCase().includes(term))
    );
  });

  return (
    <div className="page customer-portal-page">
      {/* Page Header */}
      <div className="section-header mb-4">
        <div>
          <h1 className="page__title">Cổng Dịch Vụ Khách Hàng</h1>
          <p className="text-muted">
            Quản lý thiết bị điện gia dụng, theo dõi tiến trình sửa chữa và tra cứu bảo hành
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => setShowAddDeviceModal(true)}
          >
            + Thêm thiết bị
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setCreateForm({
                deviceId: devices.length > 0 ? String(devices[0].id) : '',
                deviceTypeId: deviceTypes[0]?.id ? String(deviceTypes[0].id) : '',
                brand: '',
                model: '',
                deviceDescription: '',
                issueDescription: '',
                imageUrl: '',
                contactPhone: '',
                addressLine: '',
                preferredDatetime: '',
              });
              setShowCreateModal(true);
            }}
          >
            + Yêu cầu sửa chữa mới
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="badge badge--success p-3 mb-4 d-block font-semibold">
          ✓ {actionSuccess}
        </div>
      )}

      {error && <ErrorMessage message={error} onDismiss={() => setError(null)} />}

      {/* Main Tab Navigation */}
      <div className="tabs-header mb-4">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'devices' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          📱 Thiết bị của tôi ({devices.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'orders' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📋 Đơn sửa chữa ({orders.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'types' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('types')}
        >
          🛠 Dòng máy tiếp nhận ({deviceTypes.length})
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner message="Đang tải dữ liệu của bạn..." />
      ) : (
        <>
          {/* TAB 1: THIẾT BỊ CỦA TÔI */}
          {activeTab === 'devices' && (
            <div>
              {/* Devices Control Bar */}
              <div className="d-flex justify-content-between align-items-center mb-3 gap-3 flex-wrap">
                <div style={{ flex: '1', minWidth: '240px', maxWidth: '420px' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="🔍 Tìm theo hãng, model, số serial, loại máy..."
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                  />
                </div>
                <div className="text-sm text-muted">
                  Tìm thấy <strong>{filteredDevices.length}</strong> / {devices.length} thiết bị
                </div>
              </div>

              {devices.length === 0 ? (
                <EmptyState
                  title="Bạn chưa lưu thiết bị nào"
                  message="Hãy thêm thiết bị gia đình (máy lạnh, máy giặt, tủ lạnh...) để tiện theo dõi lịch sử bảo dưỡng và đặt sửa chữa nhanh chóng khi cần!"
                  action={
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setShowAddDeviceModal(true)}
                    >
                      + Thêm thiết bị đầu tiên
                    </button>
                  }
                />
              ) : filteredDevices.length === 0 ? (
                <EmptyState
                  title="Không tìm thấy thiết bị phù hợp"
                  message={`Không có thiết bị nào khớp với từ khóa "${deviceFilter}". Vui lòng thử lại.`}
                  action={
                    <button
                      type="button"
                      className="btn btn--outline"
                      onClick={() => setDeviceFilter('')}
                    >
                      Xóa bộ lọc
                    </button>
                  }
                />
              ) : (
                <div className="grid-3-cols gap-4">
                  {filteredDevices.map((d) => (
                    <div key={d.id} className="card p-4 hover-lift d-flex flex-column justify-content-between">
                      <div>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <span style={{ fontSize: '2rem' }} aria-hidden="true">
                            {getDeviceIcon(d.typeCode, d.typeName)}
                          </span>
                          <span className="badge badge--info">{d.typeName}</span>
                        </div>

                        <h3 className="card__title text-primary m-0 mb-1" style={{ fontSize: '1.15rem' }}>
                          {d.brand} {d.model}
                        </h3>

                        <div className="text-sm text-muted mb-2">
                          Số serial: <span className="font-semibold text-dark">{d.serialNumber || 'Chưa cập nhật'}</span>
                        </div>

                        {d.description && (
                          <div className="p-2 mb-3 bg-light rounded text-sm text-muted">
                            📍 Vị trí / Ghi chú: {d.description}
                          </div>
                        )}

                        <div className="border-top pt-2 mt-2 text-sm">
                          <div className="d-flex justify-content-between mb-1">
                            <span className="text-muted">Số lần đã sửa chữa:</span>
                            <strong>{d.totalRepairs} lần</strong>
                          </div>

                          {d.latestRepairCode && (
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-muted">Đơn gần nhất:</span>
                              <div>
                                <span className="font-semibold text-primary mr-1">{d.latestRepairCode}</span>
                                {d.latestRepairStatus && (
                                  <span className={`badge ${getRepairStatusInfo(d.latestRepairStatus).className}`}>
                                    {getRepairStatusInfo(d.latestRepairStatus).label}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-top d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm btn--full"
                          onClick={() => handleOpenRequestForDevice(d)}
                        >
                          🔧 Đặt sửa máy này
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ĐƠN SỬA CHỮA CỦA TÔI */}
          {activeTab === 'orders' && (
            <div>
              {orders.length === 0 ? (
                <EmptyState
                  title="Chưa có đơn sửa chữa nào"
                  message="Bạn chưa có phiếu sửa chữa nào trong hệ thống. Hãy tạo yêu cầu để chúng tôi hỗ trợ bạn!"
                  action={
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      Đặt lịch sửa chữa ngay
                    </button>
                  }
                />
              ) : (
                <div className="customer-orders-grid">
                  <div className="orders-table-card card">
                    <h3 className="card__title mb-3">Danh sách đơn sửa chữa của bạn ({orders.length})</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Thiết bị</th>
                          <th>Trạng thái</th>
                          <th>Lỗi phản ánh</th>
                          <th>Chi phí</th>
                          <th>Ngày tiếp nhận</th>
                          <th className="text-right">Chi tiết</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.map((o) => {
                          const st = getRepairStatusInfo(o.repairStatus);
                          return (
                            <tr
                              key={o.id}
                              className={selectedOrder?.id === o.id ? 'table-row--active' : ''}
                            >
                              <td className="font-semibold text-primary">{o.code}</td>
                              <td>
                                <strong>{o.device?.typeName || 'Điện lạnh'}</strong>
                                <div className="text-muted text-sm">{o.device?.brand} {o.device?.model}</div>
                              </td>
                              <td>
                                <span className={`badge ${st.className}`}>{st.label}</span>
                              </td>
                              <td className="text-truncate-2" style={{ maxWidth: '200px' }}>
                                {o.reportedIssue}
                              </td>
                              <td className="font-semibold">
                                {formatCurrency(o.totalAmount)}
                              </td>
                              <td className="text-sm text-muted">{formatDate(o.receivedAt || o.createdAt)}</td>
                              <td className="text-right">
                                <button
                                  type="button"
                                  className="btn btn--outline btn--sm"
                                  onClick={() => handleOpenOrderDetail(o.id)}
                                >
                                  Xem tiến độ ➔
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Selected Order Detail Sidebar / Modal */}
                  {selectedOrder && (
                    <div className="order-detail-card card mt-4 p-4 border rounded">
                      <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-3">
                        <div>
                          <h3 className="m-0 text-primary">Chi tiết đơn: {selectedOrder.code}</h3>
                          <small className="text-muted">Tiếp nhận lúc: {formatDate(selectedOrder.receivedAt || selectedOrder.createdAt)}</small>
                        </div>
                        <div>
                          <span className={`badge ${getRepairStatusInfo(selectedOrder.repairStatus).className} mr-2`}>
                            {getRepairStatusInfo(selectedOrder.repairStatus).label}
                          </span>
                          <button
                            type="button"
                            className="btn btn--outline btn--sm ml-2"
                            onClick={() => setSelectedOrder(null)}
                          >
                            ✕ Đóng
                          </button>
                        </div>
                      </div>

                      {selectedOrder.repairStatus === 'REJECTED' && (
                        <div className="alert alert--danger mb-4 p-3 rounded">
                          <strong>❌ Yêu cầu sửa chữa của quý khách đã bị từ chối tiếp nhận.</strong>
                          {selectedOrder.rejectionReason && (
                            <div className="mt-1 text-sm">
                              Lý do: <em>"{selectedOrder.rejectionReason}"</em>
                            </div>
                          )}
                          <div className="mt-2 text-xs text-muted">
                            Quý khách vui lòng liên hệ hotline trung tâm hoặc gửi lại yêu cầu với thông tin bổ sung.
                          </div>
                        </div>
                      )}

                      <div className="grid-2-cols gap-4 mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-muted mb-2">THÔNG TIN MÁY</h4>
                          <div>Loại: <strong>{selectedOrder.device?.typeName || 'Điện lạnh'}</strong></div>
                          <div>Hãng & Model: <strong>{selectedOrder.device?.brand} {selectedOrder.device?.model}</strong></div>
                          <div>Số serial: {selectedOrder.device?.serialNumber || '—'}</div>
                          <div className="mt-2 text-danger">Lỗi phản ánh: "{selectedOrder.reportedIssue}"</div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-muted mb-2">CHI PHÍ & THANH TOÁN</h4>
                          <div>Tổng tiền sửa chữa: <strong className="text-primary">{formatCurrency(selectedOrder.financials?.totalAmount)}</strong></div>
                          <div>Đã thanh toán: <strong className="text-success">{formatCurrency(selectedOrder.financials?.totalCollected)}</strong></div>
                          <div>Còn lại phải trả: <strong className="text-danger">{formatCurrency(selectedOrder.financials?.balanceDue)}</strong></div>
                        </div>
                      </div>

                      {/* BÁO GIÁ SỬA CHỮA & PHÊ DUYỆT */}
                      {selectedOrder.quotes && selectedOrder.quotes.length > 0 && (
                        <div className="quotes-section p-3 border rounded mb-4 bg-white shadow-sm">
                          <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                            <h4 className="m-0 font-semibold text-primary">📋 BÁO GIÁ DỊCH VỤ & LINH KIỆN</h4>
                            <span className="text-muted text-sm">{selectedOrder.quotes.length} phiên bản báo giá</span>
                          </div>

                          {selectedOrder.quotes.map((q) => {
                            const isPending = q.status === 'PENDING_CUSTOMER';
                            const isApproved = q.status === 'APPROVED';
                            const isRejected = q.status === 'REJECTED';
                            const adminStatus = q.adminApprovalStatus || 'PENDING';

                            return (
                              <div
                                key={q.id}
                                className={`quote-box p-3 mb-3 rounded border ${
                                  isPending && adminStatus === 'APPROVED'
                                    ? 'border-primary bg-blue-50'
                                    : isApproved
                                    ? 'border-success bg-green-50'
                                    : 'bg-light'
                                }`}
                              >
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <div>
                                    <strong className="text-base text-primary">
                                      {q.isSupplemental ? '⚡ Báo giá bổ sung' : 'Báo giá'} #{q.id} (Phiên bản v{q.versionNo})
                                    </strong>
                                    {q.isSupplemental && (
                                      <span className="badge badge--warning ml-2 font-semibold">
                                        ⚡ Phát sinh linh kiện
                                      </span>
                                    )}
                                    <span className="text-muted text-sm ml-2">
                                      • Lập bởi: {q.createdByName || 'KTV'} ({formatDate(q.createdAt)})
                                    </span>
                                  </div>
                                  <span className={`badge ${getQuoteStatusInfo(q.status).className}`}>
                                    {getQuoteStatusInfo(q.status).label}
                                  </span>
                                </div>

                                {/* Chi tiết các hạng mục báo giá */}
                                {q.items && q.items.length > 0 ? (
                                  <div className="table-responsive my-2">
                                    <table className="table table--compact w-100 text-sm">
                                      <thead>
                                        <tr className="border-bottom text-muted">
                                          <th>Hạng mục dịch vụ / Vật tư</th>
                                          <th className="text-center" style={{ width: '80px' }}>Số lượng</th>
                                          <th className="text-right" style={{ width: '130px' }}>Đơn giá</th>
                                          <th className="text-right" style={{ width: '140px' }}>Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {q.items.map((it) => (
                                          <tr key={it.id} className="border-bottom">
                                            <td>
                                              <span className={`badge mr-2 ${it.itemType === 'PART' ? 'badge--info' : 'badge--neutral'}`}>
                                                {it.itemType === 'PART' ? 'Linh kiện' : 'Công thợ'}
                                              </span>
                                              <strong>{it.description}</strong>
                                            </td>
                                            <td className="text-center">{it.quantity}</td>
                                            <td className="text-right">{formatCurrency(it.unitPrice)}</td>
                                            <td className="text-right font-semibold text-primary">{formatCurrency(it.lineTotal)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-muted text-sm italic my-2">Chi tiết tổng chi phí dự kiến sửa chữa</div>
                                )}

                                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                  <div className="text-sm">
                                    <span>Công thợ: <strong>{formatCurrency(q.laborAmount)}</strong></span>
                                    <span className="ml-3">Linh kiện: <strong>{formatCurrency(q.partsAmount)}</strong></span>
                                    {q.discountAmount > 0 && <span className="ml-3 text-success">Giảm trừ: -{formatCurrency(q.discountAmount)}</span>}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm text-muted mr-2">Tổng chi phí báo giá:</span>
                                    <strong className="text-lg text-primary">{formatCurrency(q.totalAmount)}</strong>
                                  </div>
                                </div>

                                {/* Actions nếu đang chờ khách duyệt */}
                                {isPending && adminStatus === 'APPROVED' && (
                                  <div className="alert alert--warning mt-3 p-3 d-flex flex-wrap justify-content-between align-items-center gap-2 rounded border">
                                    <div>
                                      <div className="font-semibold text-warning-dark">⚠️ BÁO GIÁ ĐANG CHỜ QUÝ KHÁCH PHÊ DUYỆT</div>
                                      <div className="text-sm text-muted">
                                        Quy trình trung tâm: Kỹ thuật viên chỉ tiến hành sửa chữa sau khi quý khách đồng ý mức báo giá này.
                                      </div>
                                    </div>
                                    <div className="d-flex gap-2">
                                      <button
                                        type="button"
                                        className="btn btn--success btn--sm font-semibold"
                                        disabled={decidingQuoteId === q.id}
                                        onClick={() => handleDecideQuote(q.id, 'APPROVED')}
                                      >
                                        {decidingQuoteId === q.id ? 'Đang duyệt...' : '✅ Đồng ý báo giá này'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn--outline-danger btn--sm"
                                        disabled={decidingQuoteId === q.id}
                                        onClick={() => {
                                          setRejectingQuote(q);
                                          setShowRejectModal(true);
                                        }}
                                      >
                                        ❌ Từ chối
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {isPending && adminStatus === 'PENDING' && (
                                  <div className="alert alert--info mt-3 p-3 rounded border">
                                    <div className="font-semibold text-info-dark">⏳ ĐANG THẨM ĐỊNH BÁO GIÁ (GIAI ĐOẠN 5)</div>
                                    <div className="text-sm text-muted">
                                      Kỹ thuật viên đã lập dự toán, Quản lý trung tâm đang thẩm định phương án và chi phí trước khi gửi quý khách phê duyệt.
                                    </div>
                                  </div>
                                )}

                                {isPending && adminStatus === 'REJECTED' && (
                                  <div className="alert alert--secondary mt-3 p-3 rounded border">
                                    <div className="font-semibold text-muted">↩️ ĐANG ĐIỀU CHỈNH BÁO GIÁ</div>
                                    <div className="text-sm text-muted">
                                      Báo giá đang được Kỹ thuật viên điều chỉnh lại phương án theo yêu cầu của Quản lý để tối ưu chi phí.
                                    </div>
                                  </div>
                                )}

                                {isApproved && (
                                  <div className="alert alert--success mt-3 py-2 px-3 text-sm rounded">
                                    ✅ <strong>Quý khách đã chấp thuận báo giá này.</strong> Kỹ thuật viên đang tiến hành sửa chữa theo đúng phương án trên.
                                  </div>
                                )}

                                {isRejected && (
                                  <div className="alert alert--danger mt-3 py-2 px-3 text-sm rounded">
                                    ❌ Quý khách đã từ chối báo giá này. Trung tâm sẽ liên hệ trao đổi phương án hỗ trợ khác.
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Timeline */}
                      <h4 className="text-sm font-semibold text-muted mb-2">TIẾN TRÌNH XỬ LÝ</h4>
                      <div className="timeline-steps mb-4">
                        {(selectedOrder.timeline || []).map((t, idx) => (
                          <div key={idx} className="timeline-item d-flex gap-3 mb-2 text-sm">
                            <span className="timeline-dot">•</span>
                            <div>
                              <strong>{getRepairStatusInfo(t.toStatus).label}</strong>
                              <span className="text-muted ml-2">({formatDate(t.changedAt)})</span>
                              {t.reason && <div className="text-muted italic">{t.reason}</div>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Warranties */}
                      {selectedOrder.warranties && selectedOrder.warranties.length > 0 && (
                        <div className="warranty-section p-3 border rounded mb-3 bg-light">
                          <h4 className="text-sm font-semibold text-success m-0 mb-1">🛡️ THẺ BẢO HÀNH CỦA BẠN</h4>
                          {selectedOrder.warranties.map((w, i) => (
                            <div key={i} className="text-sm">
                              Mã thẻ: <strong>{w.warrantyCode}</strong> | Hạn đến: <strong>{formatDate(w.endsAt)}</strong>
                              <div>Điều khoản: {w.terms}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DÒNG THIẾT BỊ TRUNG TÂM TIẾP NHẬN */}
          {activeTab === 'types' && (
            <div>
              <div className="mb-4">
                <h3 className="card__title mb-2">Dòng thiết bị điện máy & điện lạnh được hỗ trợ</h3>
                <p className="text-muted">
                  Chúng tôi cung cấp dịch vụ sửa chữa, bảo dưỡng chuyên nghiệp tận nhà với đội ngũ kỹ thuật viên giàu kinh nghiệm, linh kiện chính hãng và bảo hành dài hạn.
                </p>
              </div>

              <div className="grid-3-cols gap-4">
                {deviceTypes.map((dt) => {
                  const icon = getDeviceIcon(dt.code, dt.name);
                  return (
                    <div key={dt.id} className="card p-4 hover-lift">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <span style={{ fontSize: '2.5rem' }}>{icon}</span>
                        <div>
                          <h4 className="m-0 text-primary font-semibold" style={{ fontSize: '1.2rem' }}>
                            {dt.name}
                          </h4>
                          <span className="badge badge--success mt-1">Sẵn sàng tiếp nhận</span>
                        </div>
                      </div>

                      <div className="text-sm text-muted mb-3">
                        {dt.code === 'AIR_CONDITIONER' &&
                          'Bơm gas R32/R410A, vệ sinh dàn lạnh, sửa bo mạch Inverter, khắc phục chảy nước, quạt không quay.'}
                        {dt.code === 'REFRIGERATOR' &&
                          'Xử lý không đông đá, rò rỉ gas, rơle xả đá, thay cảm biến nhiệt, thay block chính hãng.'}
                        {dt.code === 'WASHING_MACHINE' &&
                          'Sửa lỗi vắt rung lắc, không cấp/thoát nước, thay phuộc giảm xóc, bo mạch điều khiển cửa ngang/đứng.'}
                        {dt.code === 'WATER_HEATER' &&
                          'Sửa bình nóng lạnh không nóng, nhảy chống giật ELCB, rò rỉ nước, thay thanh đốt magie.'}
                        {dt.code === 'DRYER' &&
                          'Sửa máy sấy quần áo không quay lồng, không nóng, đứt dây curoa, lỗi cảm biến nhiệt độ.'}
                        {dt.code === 'DEHUMIDIFIER' &&
                          'Sửa máy hút ẩm kêu to, không đọng nước, lỗi cảm biến độ ẩm, quạt gió ngừng hoạt động.'}
                        {!['AIR_CONDITIONER', 'REFRIGERATOR', 'WASHING_MACHINE', 'WATER_HEATER', 'DRYER', 'DEHUMIDIFIER'].includes(dt.code) &&
                          'Kiểm tra, chẩn đoán lỗi tại chỗ, thay thế linh kiện chính hãng kèm bảo hành 3-12 tháng.'}
                      </div>

                      <div className="border-top pt-3 d-flex justify-content-between align-items-center">
                        <span className="text-xs text-muted">Bảo hành: <strong>3 - 12 tháng</strong></span>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => {
                            setCreateForm({
                              deviceId: '',
                              deviceTypeId: String(dt.id),
                              brand: '',
                              model: '',
                              deviceDescription: '',
                              issueDescription: '',
                              imageUrl: '',
                              contactPhone: '',
                              addressLine: '',
                              preferredDatetime: '',
                            });
                            setShowCreateModal(true);
                          }}
                        >
                          + Đặt lịch kiểm tra
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL: THÊM THIẾT BỊ MỚI */}
      {showAddDeviceModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal__header">
              <h3 className="modal__title">Thêm thiết bị vào hồ sơ</h3>
              <button type="button" className="modal__close" onClick={() => setShowAddDeviceModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddDevice}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="new-dev-type">
                    Loại thiết bị *
                  </label>
                  <select
                    id="new-dev-type"
                    className="form-control"
                    value={newDeviceForm.deviceTypeId}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, deviceTypeId: e.target.value })}
                  >
                    {deviceTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {getDeviceIcon(t.code, t.name)} {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid-2-cols gap-3">
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-dev-brand">
                      Hãng sản xuất *
                    </label>
                    <input
                      id="new-dev-brand"
                      type="text"
                      required
                      className="form-input"
                      placeholder="Daikin, Panasonic, LG, Toshiba..."
                      value={newDeviceForm.brand}
                      onChange={(e) => setNewDeviceForm({ ...newDeviceForm, brand: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="new-dev-model">
                      Model thiết bị *
                    </label>
                    <input
                      id="new-dev-model"
                      type="text"
                      required
                      className="form-input"
                      placeholder="Inverter 1.5HP, 300L, Cửa trước 9kg..."
                      value={newDeviceForm.model}
                      onChange={(e) => setNewDeviceForm({ ...newDeviceForm, model: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-dev-serial">
                    Số serial (mã tem trên thân máy, nếu có)
                  </label>
                  <input
                    id="new-dev-serial"
                    type="text"
                    className="form-input"
                    placeholder="VD: SN-2024-98765"
                    value={newDeviceForm.serialNumber}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, serialNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="new-dev-desc">
                    Vị trí đặt máy / Ghi chú
                  </label>
                  <input
                    id="new-dev-desc"
                    type="text"
                    className="form-input"
                    placeholder="VD: Phòng khách lầu 1, Bếp, Phòng ngủ Master..."
                    value={newDeviceForm.description}
                    onChange={(e) => setNewDeviceForm({ ...newDeviceForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowAddDeviceModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Lưu thiết bị
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: YÊU CẦU SỬA CHỮA MỚI */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal__header">
              <h3 className="modal__title">Đặt lịch yêu cầu sửa chữa thiết bị</h3>
              <button type="button" className="modal__close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal__body">
                {devices.length > 0 && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="dev-choice">
                      Chọn từ thiết bị của bạn (hoặc khai báo máy mới)
                    </label>
                    <select
                      id="dev-choice"
                      className="form-control"
                      value={createForm.deviceId}
                      onChange={(e) => setCreateForm({ ...createForm, deviceId: e.target.value })}
                    >
                      <option value="">-- Khai báo thông tin máy mới bên dưới --</option>
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {getDeviceIcon(d.typeCode, d.typeName)} {d.typeName}: {d.brand} {d.model} {d.serialNumber ? `(S/N: ${d.serialNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!createForm.deviceId && (
                  <div className="p-3 bg-light rounded mb-3 border">
                    <h4 className="text-sm font-semibold text-primary mb-2">Thông tin máy cần sửa</h4>
                    <div className="form-group mb-2">
                      <label className="form-label" htmlFor="req-type">
                        Loại thiết bị *
                      </label>
                      <select
                        id="req-type"
                        className="form-control"
                        value={createForm.deviceTypeId}
                        onChange={(e) => setCreateForm({ ...createForm, deviceTypeId: e.target.value })}
                      >
                        <option value="">-- Chọn loại thiết bị --</option>
                        {deviceTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {getDeviceIcon(t.code, t.name)} {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid-2-cols gap-3">
                      <div className="form-group">
                        <label className="form-label" htmlFor="req-brand">
                          Hãng sản xuất *
                        </label>
                        <input
                          id="req-brand"
                          type="text"
                          required={!createForm.deviceId}
                          className="form-input"
                          placeholder="Daikin, Panasonic, LG..."
                          value={createForm.brand}
                          onChange={(e) => setCreateForm({ ...createForm, brand: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" htmlFor="req-model">
                          Model thiết bị *
                        </label>
                        <input
                          id="req-model"
                          type="text"
                          required={!createForm.deviceId}
                          className="form-input"
                          placeholder="Inverter 1.5HP..."
                          value={createForm.model}
                          onChange={(e) => setCreateForm({ ...createForm, model: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="req-issue">
                    Mô tả tình trạng hư hỏng *
                  </label>
                  <textarea
                    id="req-issue"
                    required
                    rows={3}
                    className="form-control"
                    placeholder="Mô tả cụ thể: Không lạnh, chảy nước dàn lạnh, kêu to, báo lỗi nháy đèn, không đông đá..."
                    value={createForm.issueDescription}
                    onChange={(e) => setCreateForm({ ...createForm, issueDescription: e.target.value })}
                  />
                </div>

                <div className="grid-2-cols gap-3">
                  <div className="form-group">
                    <label className="form-label" htmlFor="req-phone">
                      Số điện thoại liên hệ
                    </label>
                    <input
                      id="req-phone"
                      type="tel"
                      className="form-input"
                      placeholder="Nếu khác số đăng ký..."
                      value={createForm.contactPhone}
                      onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="req-time">
                      Thời gian mong muốn sửa
                    </label>
                    <input
                      id="req-time"
                      type="datetime-local"
                      className="form-input"
                      value={createForm.preferredDatetime}
                      onChange={(e) => setCreateForm({ ...createForm, preferredDatetime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="req-addr">
                    Địa chỉ sửa chữa tại nhà
                  </label>
                  <input
                    id="req-addr"
                    type="text"
                    className="form-input"
                    placeholder="Số nhà, ngõ/đường, phường, quận..."
                    value={createForm.addressLine}
                    onChange={(e) => setCreateForm({ ...createForm, addressLine: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="req-img">
                    Hình ảnh thiết bị / mã lỗi (URL ảnh)
                  </label>
                  <input
                    id="req-img"
                    type="url"
                    className="form-input"
                    placeholder="https://..."
                    value={createForm.imageUrl}
                    onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Gửi yêu cầu ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TỪ CHỐI BÁO GIÁ */}
      {showRejectModal && rejectingQuote && (
        <div className="modal-backdrop">
          <div className="modal card" style={{ maxWidth: '500px' }}>
            <div className="modal__header">
              <h3 className="modal__title text-danger">Từ chối báo giá #{rejectingQuote.id}</h3>
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectingQuote(null);
                }}
              >
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDecideQuote(rejectingQuote.id, 'REJECTED', rejectReason);
              }}
            >
              <div className="modal__body">
                <p className="text-muted text-sm mb-3">
                  Bạn có chắc chắn muốn từ chối báo giá trị giá{' '}
                  <strong className="text-primary">{formatCurrency(rejectingQuote.totalAmount)}</strong> không?
                </p>
                <div className="form-group">
                  <label className="form-label" htmlFor="reject-reason">
                    Lý do từ chối (Tùy chọn)
                  </label>
                  <textarea
                    id="reject-reason"
                    className="form-input"
                    rows={3}
                    placeholder="Ví dụ: Chi phí cao hơn dự kiến, muốn tìm hiểu phương án thay thế khác..."
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
                    setRejectingQuote(null);
                  }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="btn btn--danger font-semibold"
                  disabled={decidingQuoteId === rejectingQuote.id}
                >
                  {decidingQuoteId === rejectingQuote.id ? 'Đang gửi...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
