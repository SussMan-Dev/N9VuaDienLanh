import { useEffect, useState } from 'react';
import { getUsers, getRoles, createUser, updateUser } from '../api/users.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatDate } from '../utils/formatters.js';

const ROLE_BADGES = {
  ADMIN: { label: 'Quản trị viên', className: 'badge--danger' },
  MANAGER: { label: 'Quản lý chi nhánh', className: 'badge--primary' },
  ACCOUNTANT: { label: 'Kế toán', className: 'badge--purple' },
  RECEPTIONIST: { label: 'Lễ tân / Tiếp nhận', className: 'badge--info' },
  TECHNICIAN: { label: 'Kỹ thuật viên', className: 'badge--warning' },
  WAREHOUSE_STAFF: { label: 'Thủ kho', className: 'badge--success' },
  WAREHOUSE_MANAGER: { label: 'Quản lý kho', className: 'badge--success' },
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission ? (hasPermission('system.manage') || hasPermission('operations.manage')) : false;

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    password: '',
    roleCode: 'TECHNICIAN',
    phone: '',
    email: '',
  });
  const [createError, setCreateError] = useState(null);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    roleCode: '',
    phone: '',
    email: '',
    password: '',
    isActive: true,
  });
  const [editError, setEditError] = useState(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Notifications
  const [notification, setNotification] = useState(null);

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const loadRoles = async () => {
    const res = await getRoles();
    if (res.data && res.data.items) {
      setRoles(res.data.items);
    }
  };

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getUsers({
      search: search.trim() || undefined,
      role: selectedRole || undefined,
      isActive: selectedStatus !== '' ? selectedStatus : undefined,
      limit: 100,
    });
    if (res.error) {
      setError(res.error);
    } else {
      setUsers(res.data.items || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadRoles();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [search, selectedRole, selectedStatus]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmittingCreate(true);
    const res = await createUser({
      fullName: createForm.fullName.trim(),
      username: createForm.username.trim(),
      password: createForm.password,
      roleCode: createForm.roleCode,
      phone: createForm.phone.trim() || undefined,
      email: createForm.email.trim() || undefined,
    });
    setIsSubmittingCreate(false);
    if (res.error) {
      setCreateError(res.error);
    } else {
      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        username: '',
        password: '',
        roleCode: 'TECHNICIAN',
        phone: '',
        email: '',
      });
      showNotification('Tạo tài khoản nhân viên mới thành công!');
      loadUsers();
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditForm({
      fullName: u.fullName || '',
      roleCode: u.roles[0]?.code || 'TECHNICIAN',
      phone: u.phone || '',
      email: u.email || '',
      password: '',
      isActive: Boolean(u.isActive),
    });
    setEditError(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);
    setIsSubmittingEdit(true);
    const payload = {
      fullName: editForm.fullName.trim(),
      roleCode: editForm.roleCode,
      phone: editForm.phone.trim() || null,
      email: editForm.email.trim() || null,
      isActive: editForm.isActive,
    };
    if (editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }

    const res = await updateUser(editingUser.id, payload);
    setIsSubmittingEdit(false);
    if (res.error) {
      setEditError(res.error);
    } else {
      setEditingUser(null);
      showNotification('Cập nhật thông tin nhân sự thành công!');
      loadUsers();
    }
  };

  const getRoleBadge = (code) => {
    return ROLE_BADGES[code] || { label: code, className: 'badge--neutral' };
  };

  return (
    <div className="page">
      {notification && (
        <div className="alert alert--success mb-4" role="alert">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="page__header page__header--actions">
        <div>
          <h1 className="page__title">Quản lý Nhân sự & Phân quyền</h1>
          <p className="page__subtitle">
            Quản trị danh sách nhân viên, kỹ thuật viên, lễ tân, thủ kho và cấp quyền hệ thống
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
          >
            + Thêm nhân viên mới
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-bar__search">
          <input
            type="text"
            className="form-control"
            placeholder="Tìm theo họ tên, username, số điện thoại, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-bar__status">
          <select
            className="form-control"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>
        <div className="filter-bar__status">
          <select
            className="form-control"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="true">Đang làm việc</option>
            <option value="false">Đã khóa tài khoản</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner message="Đang tải danh sách nhân sự..." />
      ) : error ? (
        <ErrorMessage message={error} onRetry={loadUsers} />
      ) : users.length === 0 ? (
        <EmptyState
          title="Không tìm thấy nhân viên nào"
          message={
            search || selectedRole || selectedStatus !== ''
              ? 'Không có nhân sự khớp với bộ lọc tìm kiếm.'
              : 'Chưa có tài khoản nhân sự trong hệ thống.'
          }
          action={
            canManage && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setShowCreateModal(true)}
              >
                + Thêm nhân viên đầu tiên
              </button>
            )
          }
        />
      ) : (
        <div className="card table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Tên đăng nhập</th>
                <th>Vai trò</th>
                <th>Số điện thoại & Email</th>
                <th>Tải công việc (KTV)</th>
                <th>Trạng thái</th>
                <th>Ngày tham gia</th>
                {canManage && <th>Thao tác</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const primaryRole = u.roles[0]?.code || 'STAFF';
                const roleBadge = getRoleBadge(primaryRole);
                const isTechnician = u.roles.some((r) => r.code === 'TECHNICIAN');

                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary-dark)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                          }}
                        >
                          {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <strong className="font-semibold">{u.fullName}</strong>
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            ID: #{u.id} {u.branchName ? `• ${u.branchName}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <code>@{u.username}</code>
                    </td>
                    <td>
                      <span className={`badge ${roleBadge.className}`}>{roleBadge.label}</span>
                    </td>
                    <td>
                      <div>{u.phone || '—'}</div>
                      <small className="text-muted">{u.email || '—'}</small>
                    </td>
                    <td>
                      {isTechnician ? (
                        u.activeRepairsCount > 0 ? (
                          <span className="badge badge--warning">
                            🔧 {u.activeRepairsCount} phiếu đang sửa
                          </span>
                        ) : (
                          <span className="badge badge--success">
                            ✓ Sẵn sàng nhận việc
                          </span>
                        )
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge--success' : 'badge--neutral'}`}>
                        {u.isActive ? 'Đang hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td>
                      <small>{formatDate(u.createdAt)}</small>
                    </td>
                    {canManage && (
                      <td>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => openEditModal(u)}
                        >
                          ✏️ Sửa
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create User */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Thêm nhân viên mới</h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setShowCreateModal(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal__body">
                {createError && (
                  <div className="alert alert--danger mb-3">{createError}</div>
                )}
                <div className="form-group mb-3">
                  <label className="form-label">Họ và tên *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ví dụ: Nguyễn Văn Hùng"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, fullName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-row mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Tên đăng nhập *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ví dụ: ktv_hung"
                      value={createForm.username}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, username: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu khởi tạo *</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Tối thiểu 6 ký tự"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, password: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">Vai trò công việc *</label>
                  <select
                    className="form-control"
                    value={createForm.roleCode}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, roleCode: e.target.value })
                    }
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="0912345678"
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="hung@dientu.vn"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm({ ...createForm, email: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setShowCreateModal(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmittingCreate}
                >
                  {isSubmittingCreate ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {editingUser && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Sửa nhân viên: {editingUser.fullName}</h3>
              <button
                type="button"
                className="modal__close"
                onClick={() => setEditingUser(null)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal__body">
                {editError && (
                  <div className="alert alert--danger mb-3">{editError}</div>
                )}
                <div className="form-group mb-3">
                  <label className="form-label">Họ và tên *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.fullName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, fullName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">Vai trò công việc *</label>
                  <select
                    className="form-control"
                    value={editForm.roleCode}
                    onChange={(e) =>
                      setEditForm({ ...editForm, roleCode: e.target.value })
                    }
                    required
                  >
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Số điện thoại</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({ ...editForm, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={editForm.email}
                      onChange={(e) =>
                        setEditForm({ ...editForm, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">
                    Đổi mật khẩu mới (để trống nếu không đổi)
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Nhập mật khẩu mới..."
                    value={editForm.password}
                    onChange={(e) =>
                      setEditForm({ ...editForm, password: e.target.value })
                    }
                  />
                </div>
                <div className="form-group mb-3">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) =>
                        setEditForm({ ...editForm, isActive: e.target.checked })
                      }
                    />
                    <span>Tài khoản đang hoạt động (bỏ chọn để khóa tài khoản)</span>
                  </label>
                </div>
              </div>
              <div className="modal__footer">
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setEditingUser(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

