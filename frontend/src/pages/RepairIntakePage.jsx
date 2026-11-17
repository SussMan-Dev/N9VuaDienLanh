import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCustomers, createCustomer } from '../api/customers.js';
import { getDevices, createDevice } from '../api/devices.js';
import { createRepairOrder } from '../api/repairs.js';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';

export default function RepairIntakePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preCustomerId = searchParams.get('customerId');
  const preDeviceId = searchParams.get('deviceId');

  const [customers, setCustomers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [isLoadingInit, setIsLoadingInit] = useState(true);

  // Form states
  const [selectedCustomerId, setSelectedCustomerId] = useState(preCustomerId || '');
  const [selectedDeviceId, setSelectedDeviceId] = useState(preDeviceId || '');
  const [reportedIssue, setReportedIssue] = useState('');
  const [intakeCondition, setIntakeCondition] = useState('');
  const [promisedAt, setPromisedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [originalRepairOrderId, setOriginalRepairOrderId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Quick Customer Modal
  const [showQuickCust, setShowQuickCust] = useState(false);
  const [quickCustForm, setQuickCustForm] = useState({ fullName: '', phoneNumber: '', address: '' });
  const [quickCustLoading, setQuickCustLoading] = useState(false);

  // Quick Device Modal
  const [showQuickDev, setShowQuickDev] = useState(false);
  const [quickDevForm, setQuickDevForm] = useState({ brand: '', model: '', serialNumber: '', description: '' });
  const [quickDevLoading, setQuickDevLoading] = useState(false);

  // Initial load: fetch customers
  useEffect(() => {
    async function loadCustomers() {
      setIsLoadingInit(true);
      const res = await getCustomers({ limit: 100 });
      if (!res.error) {
        setCustomers(res.data.items || []);
      }
      setIsLoadingInit(false);
    }
    loadCustomers();
  }, []);

  // When selected customer changes, load customer's devices
  useEffect(() => {
    async function loadDevices() {
      if (!selectedCustomerId) {
        setDevices([]);
        setSelectedDeviceId('');
        return;
      }
      const res = await getDevices({ customerId: selectedCustomerId });
      if (!res.error) {
        const items = res.data.items || [];
        setDevices(items);
        if (preDeviceId && items.some((d) => String(d.id) === String(preDeviceId))) {
          setSelectedDeviceId(preDeviceId);
        } else if (items.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(items[0].id);
        }
      }
    }
    loadDevices();
  }, [selectedCustomerId, preDeviceId, selectedDeviceId]);

  const handleCreateQuickCustomer = async (e) => {
    e.preventDefault();
    if (!quickCustForm.fullName.trim() || !quickCustForm.phoneNumber.trim()) return;

    setQuickCustLoading(true);
    const res = await createCustomer({
      fullName: quickCustForm.fullName.trim(),
      phoneNumber: quickCustForm.phoneNumber.trim(),
      address: quickCustForm.address.trim() || undefined,
    });
    setQuickCustLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      const newCust = res.data;
      setCustomers((prev) => [newCust, ...prev]);
      setSelectedCustomerId(String(newCust.id));
      setShowQuickCust(false);
      setQuickCustForm({ fullName: '', phoneNumber: '', address: '' });
    }
  };

  const handleCreateQuickDevice = async (e) => {
    e.preventDefault();
    if (!selectedCustomerId || !quickDevForm.brand.trim() || !quickDevForm.model.trim()) return;

    setQuickDevLoading(true);
    const res = await createDevice({
      customerId: Number(selectedCustomerId),
      brand: quickDevForm.brand.trim(),
      model: quickDevForm.model.trim(),
      serialNumber: quickDevForm.serialNumber.trim() || undefined,
      description: quickDevForm.description.trim() || undefined,
    });
    setQuickDevLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      const newDev = res.data;
      setDevices((prev) => [newDev, ...prev]);
      setSelectedDeviceId(String(newDev.id));
      setShowQuickDev(false);
      setQuickDevForm({ brand: '', model: '', serialNumber: '', description: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!selectedDeviceId) {
      setError('Vui lòng chọn thiết bị tiếp nhận sửa chữa.');
      return;
    }

    if (!reportedIssue.trim()) {
      setError('Vui lòng nhập mô tả lỗi / hiện trạng khách báo.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      deviceId: Number(selectedDeviceId),
      reportedIssue: reportedIssue.trim(),
      intakeCondition: intakeCondition.trim() || undefined,
      promisedAt: promisedAt ? promisedAt.slice(0, 10) : undefined,
      notes: notes.trim() || undefined,
      originalRepairOrderId: originalRepairOrderId ? Number(originalRepairOrderId) : undefined,
    };

    const res = await createRepairOrder(payload);
    setIsSubmitting(false);

    if (res.error) {
      setError(res.error);
    } else {
      navigate(`/repairs/${res.data.id}`);
    }
  };

  if (isLoadingInit) {
    return <LoadingSpinner message="Đang chuẩn bị form tiếp nhận..." />;
  }

  return (
    <div className="page page--narrow">
      <div className="page__header page__header--actions">
        <div>
          <h1 className="page__title">Tiếp nhận phiếu sửa chữa mới</h1>
          <p className="page__subtitle">
            Lập phiếu tiếp nhận thiết bị trực tiếp tại quầy, ghi nhận hiện trạng và chuyển trạng thái ĐÃ TIẾP NHẬN (RECEIVED)
          </p>
        </div>
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => navigate('/repairs')}
        >
          ✕ Hủy
        </button>
      </div>

      <div className="card">
        {error && <ErrorMessage message={error} />}

        <form onSubmit={handleSubmit}>
          {/* Customer selection */}
          <div className="form-group">
            <div className="label-with-link">
              <label className="form-label" htmlFor="customer-select">
                Khách hàng *
              </label>
              <button
                type="button"
                className="link-btn font-semibold text-primary"
                onClick={() => setShowQuickCust(true)}
              >
                + Thêm nhanh khách hàng mới
              </button>
            </div>
            <select
              id="customer-select"
              required
              className="form-control"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
            >
              <option value="">-- Chọn khách hàng --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName} ({c.phoneNumber})
                </option>
              ))}
            </select>
          </div>

          {/* Device selection */}
          <div className="form-group">
            <div className="label-with-link">
              <label className="form-label" htmlFor="device-select">
                Thiết bị tiếp nhận *
              </label>
              {selectedCustomerId && (
                <button
                  type="button"
                  className="link-btn font-semibold text-primary"
                  onClick={() => setShowQuickDev(true)}
                >
                  + Thêm nhanh thiết bị mới
                </button>
              )}
            </div>
            <select
              id="device-select"
              required
              disabled={!selectedCustomerId || devices.length === 0}
              className="form-control"
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              <option value="">
                {!selectedCustomerId
                  ? '-- Vui lòng chọn khách hàng trước --'
                  : devices.length === 0
                  ? '-- Khách hàng chưa có thiết bị nào (Bấm + Thêm thiết bị mới phía trên) --'
                  : '-- Chọn thiết bị --'}
              </option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.typeName || d.deviceType || 'Điện lạnh'} - {d.brand} {d.model} {d.serialNumber ? `(S/N: ${d.serialNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reported issue */}
          <div className="form-group">
            <label className="form-label" htmlFor="reported-issue">
              Lỗi khách hàng thông báo *
            </label>
            <textarea
              id="reported-issue"
              required
              rows={3}
              className="form-control"
              placeholder="Mô tả cụ thể hiện tượng hư hỏng, tình trạng lỗi do khách phản ánh..."
              value={reportedIssue}
              onChange={(e) => setReportedIssue(e.target.value)}
            />
          </div>

          {/* Intake condition */}
          <div className="form-group">
            <label className="form-label" htmlFor="intake-condition">
              Hiện trạng / Ngoại quan khi nhận máy
            </label>
            <textarea
              id="intake-condition"
              rows={2}
              className="form-control"
              placeholder="Trầy xước vỏ, móp méo, phụ kiện kèm theo (ống dẫn, van, điều khiển từ xa, dây nguồn)..."
              value={intakeCondition}
              onChange={(e) => setIntakeCondition(e.target.value)}
            />
          </div>

          <div className="grid-2-cols gap-3">
            {/* Promised delivery date */}
            <div className="form-group">
              <label className="form-label" htmlFor="promised-at">
                Thời gian hẹn trả máy
              </label>
              <input
                id="promised-at"
                type="date"
                className="form-control"
                value={promisedAt}
                onChange={(e) => setPromisedAt(e.target.value)}
              />
            </div>

            {/* Warranty link if applicable */}
            <div className="form-group">
              <label className="form-label" htmlFor="original-order-id">
                Phiếu gốc (nếu là bảo hành lại)
              </label>
              <input
                id="original-order-id"
                type="number"
                className="form-control"
                placeholder="ID phiếu trước (tùy chọn)"
                value={originalRepairOrderId}
                onChange={(e) => setOriginalRepairOrderId(e.target.value)}
              />
            </div>
          </div>

          {/* Internal notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="notes">
              Ghi chú nội bộ
            </label>
            <input
              id="notes"
              type="text"
              className="form-control"
              placeholder="Yêu cầu gấp, khách VIP, phụ tùng đặt riêng..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="form-actions mt-4 pt-3 border-top">
            <button
              type="button"
              className="btn btn--outline"
              disabled={isSubmitting}
              onClick={() => navigate('/repairs')}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang tạo phiếu...' : '✔ Lập phiếu & Tiếp nhận ngay (RECEIVED)'}
            </button>
          </div>
        </form>
      </div>

      {/* QUICK ADD CUSTOMER MODAL */}
      {showQuickCust && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal__header">
              <h3 className="modal__title">Thêm nhanh khách hàng mới</h3>
              <button type="button" className="modal__close" onClick={() => setShowQuickCust(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuickCustomer}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="qc-name">
                    Họ và tên khách hàng *
                  </label>
                  <input
                    id="qc-name"
                    type="text"
                    required
                    className="form-input"
                    placeholder="Nguyễn Văn A"
                    value={quickCustForm.fullName}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, fullName: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="qc-phone">
                    Số điện thoại *
                  </label>
                  <input
                    id="qc-phone"
                    type="tel"
                    required
                    className="form-input"
                    placeholder="0912 345 678"
                    value={quickCustForm.phoneNumber}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, phoneNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="qc-addr">
                    Địa chỉ
                  </label>
                  <input
                    id="qc-addr"
                    type="text"
                    className="form-input"
                    placeholder="Số nhà, đường, phường, quận..."
                    value={quickCustForm.address}
                    onChange={(e) => setQuickCustForm({ ...quickCustForm, address: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowQuickCust(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary" disabled={quickCustLoading}>
                  {quickCustLoading ? 'Đang lưu...' : 'Lưu & Chọn ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ADD DEVICE MODAL */}
      {showQuickDev && (
        <div className="modal-backdrop">
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal__header">
              <h3 className="modal__title">Thêm nhanh thiết bị cho khách</h3>
              <button type="button" className="modal__close" onClick={() => setShowQuickDev(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuickDevice}>
              <div className="modal__body">
                <div className="grid-2-cols gap-3">
                  <div className="form-group">
                    <label className="form-label" htmlFor="qd-brand">
                      Hãng sản xuất *
                    </label>
                    <input
                      id="qd-brand"
                      type="text"
                      required
                      className="form-input"
                      placeholder="Daikin, LG, Panasonic..."
                      value={quickDevForm.brand}
                      onChange={(e) => setQuickDevForm({ ...quickDevForm, brand: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="qd-model">
                      Model *
                    </label>
                    <input
                      id="qd-model"
                      type="text"
                      required
                      className="form-input"
                      placeholder="Inverter 1.5HP, 300L..."
                      value={quickDevForm.model}
                      onChange={(e) => setQuickDevForm({ ...quickDevForm, model: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="qd-serial">
                    Số serial (mã tem)
                  </label>
                  <input
                    id="qd-serial"
                    type="text"
                    className="form-input"
                    placeholder="VD: SN-2024-8899"
                    value={quickDevForm.serialNumber}
                    onChange={(e) => setQuickDevForm({ ...quickDevForm, serialNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="qd-desc">
                    Vị trí đặt máy / Ghi chú
                  </label>
                  <input
                    id="qd-desc"
                    type="text"
                    className="form-input"
                    placeholder="VD: Phòng khách, Phòng ngủ..."
                    value={quickDevForm.description}
                    onChange={(e) => setQuickDevForm({ ...quickDevForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowQuickDev(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary" disabled={quickDevLoading}>
                  {quickDevLoading ? 'Đang lưu...' : 'Lưu & Chọn ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

