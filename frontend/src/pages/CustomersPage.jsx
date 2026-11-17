import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  setCustomerAccount,
} from '../api/customers.js';
import { createDevice, getDevices } from '../api/devices.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatDate } from '../utils/formatters.js';

export default function CustomersPage() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManageIntake = hasPermission ? hasPermission('intake.manage') : false;

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isDevicesLoading, setIsDevicesLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [createWithAccount, setCreateWithAccount] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    username: '',
    password: '',
  });
  const [customerModalError, setCustomerModalError] = useState(null);
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [newDeviceForm, setNewDeviceForm] = useState({
    deviceType: '',
    brand: '',
    model: '',
    serialNumber: '',
    notes: '',
  });
  const [deviceModalError, setDeviceModalError] = useState(null);
  const [isSubmittingDevice, setIsSubmittingDevice] = useState(false);

  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
  });
  const [editCustomerError, setEditCustomerError] = useState(null);
  const [isSubmittingEditCustomer, setIsSubmittingEditCustomer] = useState(false);

  // Account modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState('create'); // 'create' | 'reset_password'
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
    isActive: true,
  });
  const [accountModalError, setAccountModalError] = useState(null);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);

  // Toast notification
  const [notification, setNotification] = useState(null);
  const showToast = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getCustomers({ search });
    if (res.error) {
      setError(res.error);
    } else {
      const items = res.data.items || [];
      setCustomers(items);
      if (selectedCustomer) {
        const stillExists = items.find((c) => c.id === selectedCustomer.id);
        if (stillExists) {
          setSelectedCustomer(stillExists);
        } else {
          setSelectedCustomer(null);
          setDevices([]);
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setIsDevicesLoading(true);
    const res = await getDevices({ customerId: customer.id });
    if (!res.error) {
      setDevices(res.data.items || []);
    } else {
      setDevices([]);
    }
    setIsDevicesLoading(false);
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustomerModalError(null);
    setIsSubmittingCustomer(true);
    const payload = {
      fullName: newCustomerForm.fullName.trim(),
      phoneNumber: newCustomerForm.phoneNumber.trim(),
      email: newCustomerForm.email.trim() || undefined,
      address: newCustomerForm.address.trim() || undefined,
    };
    if (createWithAccount) {
      payload.username = newCustomerForm.username.trim();
      payload.password = newCustomerForm.password.trim();
    }

    const res = await createCustomer(payload);
    setIsSubmittingCustomer(false);
    if (res.error) {
      setCustomerModalError(res.error);
    } else {
      setShowAddCustomerModal(false);
      setCreateWithAccount(false);
      setNewCustomerForm({
        fullName: '',
        phoneNumber: '',
        email: '',
        address: '',
        username: '',
        password: '',
      });
      showToast('Thêm khách hàng thành công!');
      await fetchCustomers();
      if (res.data) {
        handleSelectCustomer(res.data);
      }
    }
  };

  const handleOpenEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditCustomerForm({
      fullName: selectedCustomer.fullName || '',
      phoneNumber: selectedCustomer.phoneNumber || selectedCustomer.phone || '',
      email: selectedCustomer.email || '',
      address: selectedCustomer.address || selectedCustomer.addressLine || '',
    });
    setEditCustomerError(null);
    setShowEditCustomerModal(true);
  };

  const handleUpdateCustomer = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setEditCustomerError(null);
    setIsSubmittingEditCustomer(true);
    const res = await updateCustomer(selectedCustomer.id, {
      fullName: editCustomerForm.fullName.trim(),
      phone: editCustomerForm.phoneNumber.trim(),
      email: editCustomerForm.email.trim() || null,
      addressLine: editCustomerForm.address.trim() || null,
    });
    setIsSubmittingEditCustomer(false);
    if (res.error) {
      setEditCustomerError(res.error);
    } else {
      setShowEditCustomerModal(false);
      showToast('Cập nhật thông tin khách hàng thành công!');
      await fetchCustomers();
      if (res.data) {
        setSelectedCustomer((prev) => ({
          ...prev,
          ...res.data,
          phoneNumber: res.data.phone || res.data.phoneNumber || prev.phoneNumber,
          address: res.data.addressLine || res.data.address || prev.address,
        }));
      }
    }
  };

  const handleOpenAccountModal = (mode) => {
    setAccountModalMode(mode);
    setAccountForm({
      username: selectedCustomer?.account?.username || (selectedCustomer?.phoneNumber ? `kh_${selectedCustomer.phoneNumber}` : ''),
      password: '',
      isActive: selectedCustomer?.account ? selectedCustomer.account.isActive : true,
    });
    setAccountModalError(null);
    setShowAccountModal(true);
  };

  const handleSaveAccount = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setAccountModalError(null);
    setIsSubmittingAccount(true);

    const payload = {};
    if (accountForm.username) payload.username = accountForm.username.trim();
    if (accountForm.password) payload.password = accountForm.password.trim();
    payload.isActive = accountForm.isActive;

    const res = await setCustomerAccount(selectedCustomer.id, payload);
    setIsSubmittingAccount(false);
    if (res.error) {
      setAccountModalError(res.error);
    } else {
      setShowAccountModal(false);
      showToast(
        accountModalMode === 'create'
          ? 'Đã cấp tài khoản Cổng khách hàng thành công!'
          : 'Đã cập nhật tài khoản và mật khẩu thành công!'
      );
      await fetchCustomers();
      if (res.data) {
        setSelectedCustomer(res.data);
      }
    }
  };

  const handleToggleAccountStatus = async () => {
    if (!selectedCustomer || !selectedCustomer.account) return;
    const currentActive = selectedCustomer.account.isActive;
    const confirmMsg = currentActive
      ? `Khóa tài khoản @${selectedCustomer.account.username}? Khách hàng sẽ không thể đăng nhập Cổng khách hàng.`
      : `Mở khóa tài khoản @${selectedCustomer.account.username}?`;
    if (!window.confirm(confirmMsg)) return;

    const res = await setCustomerAccount(selectedCustomer.id, {
      isActive: !currentActive,
    });
    if (!res.error) {
      showToast(currentActive ? 'Đã khóa tài khoản khách hàng.' : 'Đã mở khóa tài khoản.');
      await fetchCustomers();
      if (res.data) setSelectedCustomer(res.data);
    } else {
      alert(res.error);
    }
  };

  const handleCreateDevice = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setDeviceModalError(null);
    setIsSubmittingDevice(true);
    const res = await createDevice({
      customerId: selectedCustomer.id,
      deviceType: newDeviceForm.deviceType.trim(),
      brand: newDeviceForm.brand.trim() || undefined,
      model: newDeviceForm.model.trim() || undefined,
      serialNumber: newDeviceForm.serialNumber.trim() || undefined,
      notes: newDeviceForm.notes.trim() || undefined,
    });
    setIsSubmittingDevice(false);
    if (res.error) {
      setDeviceModalError(res.error);
    } else {
      setShowAddDeviceModal(false);
      setNewDeviceForm({ deviceType: '', brand: '', model: '', serialNumber: '', notes: '' });
      showToast('Đã thêm thiết bị mới!');
      const devRes = await getDevices({ customerId: selectedCustomer.id });
      if (!devRes.error) {
        setDevices(devRes.data.items || []);
      }
    }
  };

  return (
    <div className="page">
      {notification && (
        <div className="alert alert--success mb-4" role="alert">
          {notification}
        </div>
      )}

      <div className="page__header page__header--actions">
        <div>
          <h1 className="page__title">Quản lý Khách hàng & Thiết bị</h1>
          <p className="page__subtitle">
            Hồ sơ khách hàng, tài khoản Cổng trực tuyến và danh sách thiết bị điện lạnh
          </p>
        </div>
        {canManageIntake && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setCustomerModalError(null);
              setShowAddCustomerModal(true);
            }}
          >
            + Thêm khách hàng mới
          </button>
        )}
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="form-control"
          placeholder="Tìm theo tên, số điện thoại, mã khách hàng hoặc username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <LoadingSpinner message="Đang tải danh sách khách hàng..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={fetchCustomers} />
      ) : customers.length === 0 ? (
        <EmptyState
          title="Không tìm thấy khách hàng nào"
          message={
            search
              ? 'Không có khách hàng khớp với từ khóa tìm kiếm.'
              : 'Chưa có dữ liệu khách hàng trong hệ thống.'
          }
          action={
            canManageIntake && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowAddCustomerModal(true)}
              >
                Thêm khách hàng đầu tiên
              </button>
            )
          }
        />
      ) : (
        <div className="split-view">
          {/* Left panel: Customers List */}
          <div className="card split-view__left">
            <h3 className="card__title">Danh sách khách hàng ({customers.length})</h3>
            <div className="customer-list">
              {customers.map((c) => (
                <div
                  key={c.id}
                  className={`customer-item ${selectedCustomer?.id === c.id ? 'customer-item--active' : ''}`}
                  onClick={() => handleSelectCustomer(c)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="customer-item__header">
                    <strong className="customer-item__name">{c.fullName}</strong>
                    <span className="customer-item__phone">{c.phoneNumber}</span>
                  </div>
                  <div className="customer-item__body">
                    {c.account ? (
                      <div style={{ marginBottom: '4px' }}>
                        <span className="badge badge--info" style={{ fontSize: '0.72rem' }}>
                          👤 @{c.account.username}
                        </span>
                        {!c.account.isActive && (
                          <span className="badge badge--danger" style={{ fontSize: '0.72rem', marginLeft: '4px' }}>
                            Đã khóa
                          </span>
                        )}
                      </div>
                    ) : (
                      <div style={{ marginBottom: '4px' }}>
                        <span className="badge badge--neutral" style={{ fontSize: '0.72rem' }}>
                          Chưa có tài khoản online
                        </span>
                      </div>
                    )}
                    {c.email && <span className="customer-item__email">{c.email}</span>}
                    {c.address && <p className="customer-item__address">{c.address}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel: Selected Customer & Their Devices */}
          <div className="card split-view__right">
            {selectedCustomer ? (
              <div>
                <div className="customer-detail-header">
                  <div>
                    <h3 className="card__title">{selectedCustomer.fullName}</h3>
                    <div className="customer-detail-meta">
                      <span><strong>Mã KH:</strong> <code>{selectedCustomer.code}</code></span>
                      <span><strong>SĐT:</strong> {selectedCustomer.phoneNumber}</span>
                      {selectedCustomer.email && <span><strong>Email:</strong> {selectedCustomer.email}</span>}
                      {selectedCustomer.address && <span><strong>Địa chỉ:</strong> {selectedCustomer.address}</span>}
                      <span><strong>Ngày tạo:</strong> {formatDate(selectedCustomer.createdAt)}</span>
                    </div>
                  </div>
                  {canManageIntake && (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn btn--outline"
                        onClick={handleOpenEditCustomer}
                      >
                        ✏️ Sửa thông tin
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={() => setShowAddDeviceModal(true)}
                      >
                        + Thêm thiết bị
                      </button>
                    </div>
                  )}
                </div>

                {/* Account & Password Management Card */}
                <div
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    margin: '1.25rem 0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.75rem' }}>🔐</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                          Tài khoản Cổng khách hàng:{' '}
                          {selectedCustomer.account ? (
                            <code className="text-primary" style={{ fontSize: '1.05rem', marginLeft: '0.25rem' }}>
                              @{selectedCustomer.account.username}
                            </code>
                          ) : (
                            <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.875rem' }}>
                              Chưa cấp tài khoản online
                            </span>
                          )}
                        </div>
                        {selectedCustomer.account ? (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '3px' }}>
                            Trạng thái:{' '}
                            <span
                              className={`badge ${selectedCustomer.account.isActive ? 'badge--success' : 'badge--neutral'}`}
                              style={{ fontSize: '0.72rem' }}
                            >
                              {selectedCustomer.account.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                            </span>
                            {selectedCustomer.account.lastLoginAt ? (
                              <span style={{ marginLeft: '0.75rem' }}>
                                Đăng nhập gần nhất: {formatDate(selectedCustomer.account.lastLoginAt)}
                              </span>
                            ) : (
                              <span style={{ marginLeft: '0.75rem', color: 'var(--color-text-muted)' }}>
                                (Chưa từng đăng nhập)
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                            Cấp tài khoản & mật khẩu để khách hàng có thể đăng nhập Cổng trực tuyến và đặt lịch sửa
                          </div>
                        )}
                      </div>
                    </div>

                    {canManageIntake && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {selectedCustomer.account ? (
                          <>
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              onClick={() => handleOpenAccountModal('reset_password')}
                            >
                              🔑 Đổi mật khẩu
                            </button>
                            <button
                              type="button"
                              className={`btn btn--sm ${selectedCustomer.account.isActive ? 'btn--outline' : 'btn--primary'}`}
                              onClick={handleToggleAccountStatus}
                            >
                              {selectedCustomer.account.isActive ? '🔒 Khóa tài khoản' : '🔓 Mở khóa'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            onClick={() => handleOpenAccountModal('create')}
                          >
                            + Cấp tài khoản trực tuyến
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <hr className="divider" />

                <h4 className="section-title">Danh sách thiết bị ({devices.length})</h4>
                {isDevicesLoading ? (
                  <LoadingSpinner message="Đang tải thiết bị..." />
                ) : devices.length === 0 ? (
                  <EmptyState
                    title="Chưa có thiết bị nào"
                    message="Khách hàng này chưa có thiết bị nào được lưu trong hệ thống."
                    action={
                      canManageIntake && (
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => setShowAddDeviceModal(true)}
                        >
                          + Thêm thiết bị ngay
                        </button>
                      )
                    }
                  />
                ) : (
                  <div className="device-cards">
                    {devices.map((d) => (
                      <div key={d.id} className="device-card">
                        <div className="device-card__header">
                          <span className="device-card__type">{d.deviceType || 'Điện lạnh'}</span>
                          {d.brand && <span className="device-card__brand">{d.brand}</span>}
                        </div>
                        <div className="device-card__body">
                          {d.model && (
                            <p className="device-card__model">
                              <strong>Model:</strong> {d.model}
                            </p>
                          )}
                          {d.serialNumber && (
                            <p className="device-card__serial">
                              <strong>Serial:</strong> {d.serialNumber}
                            </p>
                          )}
                          {d.notes && <p className="device-card__notes">{d.notes}</p>}
                        </div>
                        {canManageIntake && (
                          <div className="device-card__footer">
                            <button
                              type="button"
                              className="btn btn--primary btn--sm"
                              onClick={() =>
                                navigate(
                                  `/repairs/new?customerId=${selectedCustomer.id}&deviceId=${d.id}`
                                )
                              }
                            >
                              + Tiếp nhận sửa máy
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title="Chưa chọn khách hàng"
                message="Hãy chọn một khách hàng từ danh sách bên trái để xem hồ sơ, tài khoản và thiết bị."
              />
            )}
          </div>
        </div>
      )}

      {/* Modal: Add Customer */}
      {showAddCustomerModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Thêm khách hàng mới</h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowAddCustomerModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal__body">
                {customerModalError && (
                  <div className="alert alert--danger mb-3">{customerModalError}</div>
                )}
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="cust-name">
                    Họ và tên *
                  </label>
                  <input
                    id="cust-name"
                    type="text"
                    className="form-control"
                    placeholder="Nguyễn Văn A"
                    value={newCustomerForm.fullName}
                    onChange={(e) =>
                      setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="cust-phone">
                    Số điện thoại *
                  </label>
                  <input
                    id="cust-phone"
                    type="tel"
                    className="form-control"
                    placeholder="0912345678"
                    value={newCustomerForm.phoneNumber}
                    onChange={(e) =>
                      setNewCustomerForm({ ...newCustomerForm, phoneNumber: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="cust-email">
                    Email
                  </label>
                  <input
                    id="cust-email"
                    type="email"
                    className="form-control"
                    placeholder="example@mail.com"
                    value={newCustomerForm.email}
                    onChange={(e) =>
                      setNewCustomerForm({ ...newCustomerForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="cust-address">
                    Địa chỉ liên hệ
                  </label>
                  <input
                    id="cust-address"
                    type="text"
                    className="form-control"
                    placeholder="Số 10, Đường ABC, Quận XYZ..."
                    value={newCustomerForm.address}
                    onChange={(e) =>
                      setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
                    }
                  />
                </div>

                {/* Account Toggle */}
                <div className="form-group mb-3" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={createWithAccount}
                      onChange={(e) => setCreateWithAccount(e.target.checked)}
                    />
                    <strong>Cấp tài khoản đăng nhập Cổng khách hàng ngay</strong>
                  </label>
                </div>

                {createWithAccount && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem',
                      background: 'var(--color-bg)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      marginBottom: '1rem',
                    }}
                  >
                    <div className="form-group">
                      <label className="form-label">Tên đăng nhập *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="kh_vana"
                        value={newCustomerForm.username}
                        onChange={(e) =>
                          setNewCustomerForm({ ...newCustomerForm, username: e.target.value })
                        }
                        required={createWithAccount}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mật khẩu *</label>
                      <input
                        type="password"
                        className="form-control"
                        placeholder="Tối thiểu 6 ký tự"
                        value={newCustomerForm.password}
                        onChange={(e) =>
                          setNewCustomerForm({ ...newCustomerForm, password: e.target.value })
                        }
                        required={createWithAccount}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowAddCustomerModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmittingCustomer}
                >
                  {isSubmittingCustomer ? 'Đang lưu...' : 'Lưu khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Customer */}
      {showEditCustomerModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Sửa thông tin khách hàng</h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowEditCustomerModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdateCustomer}>
              <div className="modal__body">
                {editCustomerError && (
                  <div className="alert alert--danger mb-3">{editCustomerError}</div>
                )}
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="edit-cust-name">
                    Họ và tên *
                  </label>
                  <input
                    id="edit-cust-name"
                    type="text"
                    className="form-control"
                    value={editCustomerForm.fullName}
                    onChange={(e) =>
                      setEditCustomerForm({ ...editCustomerForm, fullName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="edit-cust-phone">
                    Số điện thoại *
                  </label>
                  <input
                    id="edit-cust-phone"
                    type="tel"
                    className="form-control"
                    value={editCustomerForm.phoneNumber}
                    onChange={(e) =>
                      setEditCustomerForm({ ...editCustomerForm, phoneNumber: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="edit-cust-email">
                    Email
                  </label>
                  <input
                    id="edit-cust-email"
                    type="email"
                    className="form-control"
                    value={editCustomerForm.email}
                    onChange={(e) =>
                      setEditCustomerForm({ ...editCustomerForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="edit-cust-address">
                    Địa chỉ
                  </label>
                  <input
                    id="edit-cust-address"
                    type="text"
                    className="form-control"
                    value={editCustomerForm.address}
                    onChange={(e) =>
                      setEditCustomerForm({ ...editCustomerForm, address: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowEditCustomerModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmittingEditCustomer}
                >
                  {isSubmittingEditCustomer ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Account & Password Management */}
      {showAccountModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                {accountModalMode === 'create'
                  ? `Cấp tài khoản online cho: ${selectedCustomer?.fullName}`
                  : `Đổi mật khẩu / Quản lý tài khoản @${selectedCustomer?.account?.username}`}
              </h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowAccountModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAccount}>
              <div className="modal__body">
                {accountModalError && (
                  <div className="alert alert--danger mb-3">{accountModalError}</div>
                )}
                <div className="form-group mb-3">
                  <label className="form-label">Tên đăng nhập *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={accountForm.username}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, username: e.target.value })
                    }
                    placeholder="Ví dụ: kh_nam"
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">
                    {accountModalMode === 'create'
                      ? 'Mật khẩu khởi tạo *'
                      : 'Mật khẩu mới (tối thiểu 6 ký tự)'}
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Nhập mật khẩu..."
                    value={accountForm.password}
                    onChange={(e) =>
                      setAccountForm({ ...accountForm, password: e.target.value })
                    }
                    required={accountModalMode === 'create'}
                  />
                  {accountModalMode !== 'create' && (
                    <small className="text-muted">
                      Nhập mật khẩu mới nếu muốn đổi mật khẩu cho khách hàng này.
                    </small>
                  )}
                </div>
                <div className="form-group mb-3">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={accountForm.isActive}
                      onChange={(e) =>
                        setAccountForm({ ...accountForm, isActive: e.target.checked })
                      }
                    />
                    <span>Kích hoạt tài khoản (khách có thể đăng nhập)</span>
                  </label>
                </div>
              </div>
              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowAccountModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmittingAccount}
                >
                  {isSubmittingAccount ? 'Đang lưu...' : 'Lưu tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Device */}
      {showAddDeviceModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                Thêm thiết bị cho: {selectedCustomer?.fullName}
              </h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowAddDeviceModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDevice}>
              <div className="modal__body">
                {deviceModalError && (
                  <div className="alert alert--danger mb-3">{deviceModalError}</div>
                )}
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="dev-type">
                    Loại thiết bị *
                  </label>
                  <input
                    id="dev-type"
                    type="text"
                    className="form-control"
                    placeholder="Máy lạnh, Tủ lạnh, Máy giặt..."
                    value={newDeviceForm.deviceType}
                    onChange={(e) =>
                      setNewDeviceForm({ ...newDeviceForm, deviceType: e.target.value })
                    }
                    required
                  />
                </div>
                <div
                  className="form-row mb-3"
                  style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}
                >
                  <div className="form-group">
                    <label className="form-label" htmlFor="dev-brand">
                      Hãng sản xuất
                    </label>
                    <input
                      id="dev-brand"
                      type="text"
                      className="form-control"
                      placeholder="Daikin, Panasonic, LG..."
                      value={newDeviceForm.brand}
                      onChange={(e) =>
                        setNewDeviceForm({ ...newDeviceForm, brand: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="dev-model">
                      Model / Đời máy
                    </label>
                    <input
                      id="dev-model"
                      type="text"
                      className="form-control"
                      placeholder="Inverter 1.5 HP, GR-B22..."
                      value={newDeviceForm.model}
                      onChange={(e) =>
                        setNewDeviceForm({ ...newDeviceForm, model: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="dev-serial">
                    Số Serial / Mã máy (tùy chọn)
                  </label>
                  <input
                    id="dev-serial"
                    type="text"
                    className="form-control"
                    placeholder="SN123456789..."
                    value={newDeviceForm.serialNumber}
                    onChange={(e) =>
                      setNewDeviceForm({ ...newDeviceForm, serialNumber: e.target.value })
                    }
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label" htmlFor="dev-notes">
                    Ghi chú thiết bị
                  </label>
                  <textarea
                    id="dev-notes"
                    className="form-control"
                    rows={2}
                    placeholder="Vị trí lắp đặt, tình trạng bề ngoài..."
                    value={newDeviceForm.notes}
                    onChange={(e) =>
                      setNewDeviceForm({ ...newDeviceForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowAddDeviceModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmittingDevice}
                >
                  {isSubmittingDevice ? 'Đang lưu...' : 'Lưu thiết bị'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
