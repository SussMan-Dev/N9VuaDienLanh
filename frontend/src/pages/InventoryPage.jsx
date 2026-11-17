import { useEffect, useState } from 'react';
import {
  createInventoryItem,
  createInventoryTransaction,
  getInventoryItems,
  getInventoryTransactions,
  getStocks,
  getWarehouses,
  updateInventoryItem,
} from '../api/inventory.js';
import {
  getPartsRequests,
  approvePartsRequest,
  rejectPartsRequest,
  issuePartsRequest,
} from '../api/parts-requests.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { formatCurrency, formatDate, getPartsRequestStatusInfo } from '../utils/formatters.js';

const TX_TYPES = {
  RECEIPT: { label: 'Nhập hàng', className: 'badge--success' },
  ISSUE: { label: 'Xuất kho', className: 'badge--danger' },
  ADJUSTMENT_IN: { label: 'Điều chỉnh tăng', className: 'badge--info' },
  ADJUSTMENT_OUT: { label: 'Điều chỉnh giảm', className: 'badge--warning' },
};

export default function InventoryPage() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission ? (hasPermission('inventory.manage') || hasPermission('warehouse.manage') || hasPermission('operations.manage')) : false;

  // Active tab: 'items' | 'stocks' | 'transactions' | 'requests'
  const [activeTab, setActiveTab] = useState('items');

  // Shared state
  const [warehouses, setWarehouses] = useState([]);
  const [partsRequests, setPartsRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Tab Items state
  const [items, setItems] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemFilterActive, setItemFilterActive] = useState('');

  // Tab Stocks state
  const [stocks, setStocks] = useState([]);
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState('');
  const [stockLowOnly, setStockLowOnly] = useState(false);

  // Tab Transactions state
  const [transactions, setTransactions] = useState([]);

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemForm, setItemForm] = useState({
    sku: '',
    name: '',
    unit: 'cái',
    standardCost: '',
    defaultSalePrice: '',
    reorderLevel: 5,
    isActive: true,
  });

  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({
    warehouseId: '',
    inventoryItemId: '',
    transactionType: 'RECEIPT',
    quantity: '',
    unitCostSnapshot: '',
    notes: '',
  });

  const showNotification = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Load initial data
  const loadWarehouses = async () => {
    const res = await getWarehouses();
    if (!res.error) {
      setWarehouses(res.data.items || []);
    }
  };

  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    const params = {};
    if (itemSearch) params.search = itemSearch;
    if (itemFilterActive !== '') params.isActive = itemFilterActive;
    const res = await getInventoryItems(params);
    if (res.error) {
      setError(res.error);
    } else {
      setItems(res.data.items || []);
    }
    setIsLoading(false);
  };

  const loadStocks = async () => {
    setIsLoading(true);
    setError(null);
    const params = {};
    if (stockWarehouseFilter) params.warehouseId = stockWarehouseFilter;
    if (stockLowOnly) params.lowStock = true;
    const res = await getStocks(params);
    if (res.error) {
      setError(res.error);
    } else {
      setStocks(res.data.items || []);
    }
    setIsLoading(false);
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    setError(null);
    const res = await getInventoryTransactions();
    if (res.error) {
      setError(res.error);
    } else {
      setTransactions(res.data.items || []);
    }
    setIsLoading(false);
  };

  const loadRequests = async () => {
    setIsLoading(true);
    const res = await getPartsRequests({ limit: 100 });
    if (res.data) {
      setPartsRequests(res.data.items || []);
    }
    setIsLoading(false);
  };

  const handleApproveRequest = async (id) => {
    const res = await approvePartsRequest(id);
    if (!res.error) {
      showNotification('Duyệt yêu cầu cấp phát thành công!');
      loadRequests();
    } else {
      setActionError(res.error);
    }
  };

  const handleRejectRequest = async (id) => {
    const reason = window.prompt('Nhập lý do từ chối:');
    if (!reason) return;
    const res = await rejectPartsRequest(id, { rejectionReason: reason });
    if (!res.error) {
      showNotification('Đã từ chối yêu cầu.');
      loadRequests();
    } else {
      setActionError(res.error);
    }
  };

  const handleIssueRequest = async (id) => {
    if (!window.confirm('Xác nhận xuất kho cho yêu cầu này? Tồn kho sẽ tự động trừ.')) return;
    const res = await issuePartsRequest(id);
    if (!res.error) {
      showNotification('Xuất kho thành công! Đã tự động trừ tồn kho.');
      loadRequests();
    } else {
      setActionError(res.error);
    }
  };

  useEffect(() => {
    loadWarehouses();
    loadRequests();
  }, []);

  useEffect(() => {
    if (activeTab === 'items') loadItems();
    else if (activeTab === 'stocks') loadStocks();
    else if (activeTab === 'transactions') loadTransactions();
    else if (activeTab === 'requests') loadRequests();
  }, [activeTab, itemSearch, itemFilterActive, stockWarehouseFilter, stockLowOnly]);

  // Handlers
  const openCreateItemModal = () => {
    setEditingItem(null);
    setItemForm({
      sku: '',
      name: '',
      unit: 'cái',
      standardCost: '',
      defaultSalePrice: '',
      reorderLevel: 5,
      isActive: true,
    });
    setShowItemModal(true);
  };

  const openEditItemModal = (item) => {
    setEditingItem(item);
    setItemForm({
      sku: item.sku,
      name: item.name,
      unit: item.unit,
      standardCost: String(item.standardCost || 0),
      defaultSalePrice: String(item.defaultSalePrice || 0),
      reorderLevel: item.reorderLevel ?? 5,
      isActive: Boolean(item.isActive),
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    setActionError(null);
    if (editingItem) {
      // Update
      const res = await updateInventoryItem(editingItem.id, {
        name: itemForm.name.trim(),
        unit: itemForm.unit.trim(),
        standardCost: Number(itemForm.standardCost) || 0,
        defaultSalePrice: Number(itemForm.defaultSalePrice) || 0,
        reorderLevel: Number(itemForm.reorderLevel) || 0,
        isActive: Boolean(itemForm.isActive),
      });
      if (res.error) {
        setActionError(res.error);
      } else {
        setShowItemModal(false);
        showNotification('Cập nhật thông tin mặt hàng thành công!');
        loadItems();
      }
    } else {
      // Create
      const res = await createInventoryItem({
        sku: itemForm.sku.trim(),
        name: itemForm.name.trim(),
        unit: itemForm.unit.trim(),
        standardCost: Number(itemForm.standardCost) || 0,
        defaultSalePrice: Number(itemForm.defaultSalePrice) || 0,
        reorderLevel: Number(itemForm.reorderLevel) || 0,
      });
      if (res.error) {
        setActionError(res.error);
      } else {
        setShowItemModal(false);
        showNotification('Tạo mặt hàng mới thành công!');
        loadItems();
      }
    }
  };

  const openCreateTxModal = () => {
    setTxForm({
      warehouseId: warehouses.length > 0 ? String(warehouses[0].id) : '',
      inventoryItemId: items.length > 0 ? String(items[0].id) : '',
      transactionType: 'RECEIPT',
      quantity: '',
      unitCostSnapshot: '',
      notes: '',
    });
    setShowTxModal(true);
  };

  const handleSaveTx = async (e) => {
    e.preventDefault();
    setActionError(null);
    const res = await createInventoryTransaction({
      warehouseId: Number(txForm.warehouseId),
      inventoryItemId: Number(txForm.inventoryItemId),
      transactionType: txForm.transactionType,
      quantity: Number(txForm.quantity),
      unitCostSnapshot: txForm.unitCostSnapshot ? Number(txForm.unitCostSnapshot) : undefined,
      notes: txForm.notes.trim() || undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowTxModal(false);
      showNotification('Ghi nhận giao dịch kho thành công!');
      if (activeTab === 'transactions') loadTransactions();
      else if (activeTab === 'stocks') loadStocks();
    }
  };

  return (
    <div className="page">
      {/* Toast & Error messages */}
      {actionSuccess && <div className="toast toast--success">{actionSuccess}</div>}
      {actionError && <ErrorMessage message={actionError} />}

      {/* Page Header */}
      <div className="page__header page__header--actions">
        <div>
          <h1 className="page__title">Quản lý Kho vật tư & Linh kiện</h1>
          <p className="page__subtitle">Theo dõi danh mục linh kiện, tồn kho thực tế và nhật ký nhập/xuất kho</p>
        </div>
        {canManage && (
          <div className="header-button-group">
            <button type="button" className="btn btn--outline" onClick={openCreateTxModal}>
              ⇄ Nhập / Xuất kho
            </button>
            <button type="button" className="btn btn--primary" onClick={openCreateItemModal}>
              + Tạo mặt hàng mới
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs-header">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'items' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('items')}
        >
          📦 Danh mục mặt hàng ({items.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'stocks' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('stocks')}
        >
          📊 Tồn kho & Cảnh báo ({stocks.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'transactions' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('transactions')}
        >
          📜 Lịch sử nhập / xuất
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'requests' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📑 Yêu cầu cấp phát ({partsRequests.length})
        </button>
      </div>

      {/* TAB 1: ITEMS */}
      {activeTab === 'items' && (
        <div>
          <div className="filter-bar">
            <div className="filter-bar__search">
              <input
                type="text"
                className="form-control"
                placeholder="Tìm theo mã SKU hoặc tên mặt hàng..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>
            <div className="filter-bar__status">
              <select
                className="form-control"
                value={itemFilterActive}
                onChange={(e) => setItemFilterActive(e.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang kinh doanh</option>
                <option value="false">Ngừng kinh doanh</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Đang tải danh mục mặt hàng..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadItems} />
          ) : items.length === 0 ? (
            <EmptyState
              title="Chưa có mặt hàng nào"
              message={itemSearch ? 'Không có mặt hàng khớp với tìm kiếm.' : 'Chưa có mặt hàng trong danh mục.'}
              action={
                canManage && (
                  <button type="button" className="btn btn--primary" onClick={openCreateItemModal}>
                    Tạo mặt hàng đầu tiên
                  </button>
                )
              }
            />
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã SKU</th>
                    <th>Tên linh kiện / Vật tư</th>
                    <th>ĐVT</th>
                    <th className="text-right">Giá vốn chuẩn</th>
                    <th className="text-right">Giá bán đề xuất</th>
                    <th className="text-right">Tồn tối thiểu</th>
                    <th>Trạng thái</th>
                    {canManage && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code>{item.sku}</code>
                      </td>
                      <td className="font-semibold">{item.name}</td>
                      <td>{item.unit}</td>
                      <td className="text-right">{formatCurrency(item.standardCost)}</td>
                      <td className="text-right font-semibold text-primary">{formatCurrency(item.defaultSalePrice)}</td>
                      <td className="text-right">{item.reorderLevel}</td>
                      <td>
                        <span className={`badge ${item.isActive ? 'badge--success' : 'badge--neutral'}`}>
                          {item.isActive ? 'Đang dùng' : 'Tạm ngưng'}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          <button
                            type="button"
                            className="btn btn--outline btn--sm"
                            onClick={() => openEditItemModal(item)}
                          >
                            Sửa
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STOCKS */}
      {activeTab === 'stocks' && (
        <div>
          <div className="filter-bar">
            <div className="filter-bar__search">
              <select
                className="form-control"
                value={stockWarehouseFilter}
                onChange={(e) => setStockWarehouseFilter(e.target.value)}
              >
                <option value="">Tất cả kho hàng</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.branchName})
                  </option>
                ))}
              </select>
            </div>
            <div className="checkbox-group" style={{ display: 'flex', alignItems: 'center' }}>
              <label>
                <input
                  type="checkbox"
                  checked={stockLowOnly}
                  onChange={(e) => setStockLowOnly(e.target.checked)}
                />{' '}
                <strong className="text-danger">⚠️ Chỉ hiện mặt hàng dưới mức tối thiểu (Low stock)</strong>
              </label>
            </div>
          </div>

          {isLoading ? (
            <LoadingSpinner message="Đang tải dữ liệu tồn kho..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadStocks} />
          ) : stocks.length === 0 ? (
            <EmptyState
              title="Không có dữ liệu tồn kho"
              message={stockLowOnly ? 'Không có mặt hàng nào dưới mức tồn kho tối thiểu.' : 'Chưa có bản ghi tồn kho nào.'}
            />
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Kho hàng</th>
                    <th>Mã SKU</th>
                    <th>Tên linh kiện</th>
                    <th>ĐVT</th>
                    <th className="text-right">Tồn thực tế</th>
                    <th className="text-right">Đang giữ</th>
                    <th className="text-right">Mức tối thiểu</th>
                    <th>Tình trạng tồn</th>
                    <th>Cập nhật lần cuối</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => {
                    const isLow = s.quantityOnHand <= s.reorderLevel;
                    return (
                      <tr key={s.id} className={isLow ? 'table-row--warning' : ''}>
                        <td>
                          <strong>{s.warehouseName}</strong>
                        </td>
                        <td>
                          <code>{s.sku}</code>
                        </td>
                        <td className="font-semibold">{s.itemName}</td>
                        <td>{s.unit}</td>
                        <td className={`text-right font-semibold ${isLow ? 'text-danger' : 'text-success'}`}>
                          {s.quantityOnHand}
                        </td>
                        <td className="text-right text-muted">{s.quantityReserved}</td>
                        <td className="text-right">{s.reorderLevel}</td>
                        <td>
                          {isLow ? (
                            <span className="badge badge--danger">⚠️ Cần nhập thêm</span>
                          ) : (
                            <span className="badge badge--success">Đủ tồn kho</span>
                          )}
                        </td>
                        <td>
                          <small>{formatDate(s.updatedAt)}</small>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div>
          {isLoading ? (
            <LoadingSpinner message="Đang tải lịch sử nhập xuất..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadTransactions} />
          ) : transactions.length === 0 ? (
            <EmptyState
              title="Chưa có giao dịch kho"
              message="Chưa có lượt nhập hoặc xuất kho nào được ghi nhận."
              action={
                canManage && (
                  <button type="button" className="btn btn--primary" onClick={openCreateTxModal}>
                    Lập phiếu nhập kho đầu tiên
                  </button>
                )
              }
            />
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Loại giao dịch</th>
                    <th>Mặt hàng</th>
                    <th>Kho</th>
                    <th className="text-right">Số lượng</th>
                    <th className="text-right">Đơn giá vốn</th>
                    <th>Người thực hiện</th>
                    <th>Thời gian</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => {
                    const typeInfo = TX_TYPES[tx.transactionType] || { label: tx.transactionType, className: 'badge--neutral' };
                    return (
                      <tr key={tx.id}>
                        <td>#{tx.id}</td>
                        <td>
                          <span className={`badge ${typeInfo.className}`}>{typeInfo.label}</span>
                        </td>
                        <td>
                          <div className="font-semibold">{tx.itemName}</div>
                          <code className="text-sm">{tx.sku}</code>
                        </td>
                        <td>{tx.warehouseName}</td>
                        <td className="text-right font-semibold">
                          {['ISSUE', 'ADJUSTMENT_OUT'].includes(tx.transactionType) ? `-${tx.quantity}` : `+${tx.quantity}`}
                        </td>
                        <td className="text-right">{formatCurrency(tx.unitCostSnapshot)}</td>
                        <td>{tx.performedByName}</td>
                        <td>
                          <small>{formatDate(tx.occurredAt || tx.createdAt)}</small>
                        </td>
                        <td>{tx.notes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PARTS REQUESTS */}
      {activeTab === 'requests' && (
        <div>
          {isLoading ? (
            <LoadingSpinner message="Đang tải danh sách yêu cầu cấp phát..." />
          ) : error ? (
            <ErrorMessage message={error} onRetry={loadRequests} />
          ) : partsRequests.length === 0 ? (
            <EmptyState
              title="Chưa có yêu cầu cấp phát linh kiện"
              message="Hiện chưa có kỹ thuật viên nào gửi yêu cầu cấp phát vật tư/linh kiện."
            />
          ) : (
            <div className="card table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã YC</th>
                    <th>Đơn sửa chữa</th>
                    <th>KTV yêu cầu</th>
                    <th>Linh kiện cần cấp</th>
                    <th>Lý do & Ghi chú</th>
                    <th>Trạng thái</th>
                    <th>Thời gian</th>
                    {canManage && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {partsRequests.map((req) => {
                    const st = getPartsRequestStatusInfo(req.status);
                    return (
                      <tr key={req.id}>
                        <td>
                          <strong>{req.requestCode}</strong>
                        </td>
                        <td>
                          {req.repairOrderId ? (
                            <a href={`/repairs/${req.repairOrderId}`} className="font-semibold text-primary">
                              #{req.repairOrderId} {req.repairOrderCode ? `(${req.repairOrderCode})` : ''}
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <div className="font-semibold">{req.requestedByName || 'KTV'}</div>
                          <small className="text-muted">ID: {req.requestedByUserId}</small>
                        </td>
                        <td>
                          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.875rem' }}>
                            {req.items?.map((it) => (
                              <li key={it.id}>
                                <strong>{it.inventoryItemName || `Item #${it.inventoryItemId}`}</strong>
                                {it.inventoryItemSku ? ` (${it.inventoryItemSku})` : ''}:{' '}
                                <span className="badge badge--neutral">YC: {it.quantityRequested} {it.inventoryItemUnit || 'cái'}</span>
                                {it.quantityApproved !== null && (
                                  <span className="badge badge--info" style={{ marginLeft: '4px' }}>
                                    Duyệt: {it.quantityApproved}
                                  </span>
                                )}
                                {it.quantityIssued !== null && (
                                  <span className="badge badge--success" style={{ marginLeft: '4px' }}>
                                    Đã xuất: {it.quantityIssued}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td>
                          {req.reason && <div><strong>Lý do:</strong> {req.reason}</div>}
                          {req.notes && <small className="text-muted">{req.notes}</small>}
                          {req.rejectionReason && (
                            <div className="text-danger" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                              <strong>Từ chối:</strong> {req.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${st.className}`}>{st.label}</span>
                          {req.reviewedByName && (
                            <div style={{ fontSize: '0.75rem', marginTop: '2px' }} className="text-muted">
                              bởi {req.reviewedByName}
                            </div>
                          )}
                        </td>
                        <td>
                          <small>{formatDate(req.createdAt)}</small>
                        </td>
                        {canManage && (
                          <td>
                            <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                              {req.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn--outline btn--sm"
                                    style={{ color: 'var(--color-success)', borderColor: 'var(--color-success)' }}
                                    onClick={() => handleApproveRequest(req.id)}
                                  >
                                    ✓ Duyệt
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--outline btn--sm"
                                    style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                                    onClick={() => handleRejectRequest(req.id)}
                                  >
                                    ✕ Từ chối
                                  </button>
                                </>
                              )}
                              {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                                <button
                                  type="button"
                                  className="btn btn--primary btn--sm"
                                  onClick={() => handleIssueRequest(req.id)}
                                >
                                  📦 Xuất kho
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE / EDIT ITEM */}
      {showItemModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                {editingItem ? `Sửa mặt hàng: ${editingItem.sku}` : 'Thêm mặt hàng linh kiện mới'}
              </h3>
              <button type="button" className="modal__close" onClick={() => setShowItemModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveItem}>
              <div className="modal__body">
                {!editingItem && (
                  <div className="form-group">
                    <label className="form-label" htmlFor="item-sku">
                      Mã SKU *
                    </label>
                    <input
                      id="item-sku"
                      type="text"
                      required
                      className="form-control"
                      placeholder="CAP-450V-100UF, SCR-IP14-OLED..."
                      value={itemForm.sku}
                      onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label" htmlFor="item-name">
                    Tên mặt hàng *
                  </label>
                  <input
                    id="item-name"
                    type="text"
                    required
                    className="form-control"
                    placeholder="Tụ điện 450V 100uF, Màn hình iPhone 14..."
                    value={itemForm.name}
                    onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="item-unit">
                      Đơn vị tính *
                    </label>
                    <input
                      id="item-unit"
                      type="text"
                      required
                      className="form-control"
                      placeholder="cái, bộ, mét, cuộn..."
                      value={itemForm.unit}
                      onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="item-reorder">
                      Mức cảnh báo tồn tối thiểu *
                    </label>
                    <input
                      id="item-reorder"
                      type="number"
                      min="0"
                      required
                      className="form-control"
                      value={itemForm.reorderLevel}
                      onChange={(e) => setItemForm({ ...itemForm, reorderLevel: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="item-cost">
                      Giá vốn tiêu chuẩn (VNĐ)
                    </label>
                    <input
                      id="item-cost"
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      placeholder="50000"
                      value={itemForm.standardCost}
                      onChange={(e) => setItemForm({ ...itemForm, standardCost: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="item-price">
                      Giá bán đề xuất (VNĐ)
                    </label>
                    <input
                      id="item-price"
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      placeholder="100000"
                      value={itemForm.defaultSalePrice}
                      onChange={(e) => setItemForm({ ...itemForm, defaultSalePrice: e.target.value })}
                    />
                  </div>
                </div>
                {editingItem && (
                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={itemForm.isActive}
                        onChange={(e) => setItemForm({ ...itemForm, isActive: e.target.checked })}
                      />{' '}
                      Mặt hàng đang hoạt động (Kinh doanh)
                    </label>
                  </div>
                )}
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowItemModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  {editingItem ? 'Lưu thay đổi' : 'Tạo mặt hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE TRANSACTION */}
      {showTxModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Nhập / Xuất kho vật tư</h3>
              <button type="button" className="modal__close" onClick={() => setShowTxModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveTx}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="tx-type">
                    Loại giao dịch *
                  </label>
                  <select
                    id="tx-type"
                    required
                    className="form-control"
                    value={txForm.transactionType}
                    onChange={(e) => setTxForm({ ...txForm, transactionType: e.target.value })}
                  >
                    <option value="RECEIPT">Nhập kho (Hàng mới về / Mua thêm)</option>
                    <option value="ISSUE">Xuất kho (Xuất sử dụng)</option>
                    <option value="ADJUSTMENT_IN">Điều chỉnh tăng (Kiểm kê dư)</option>
                    <option value="ADJUSTMENT_OUT">Điều chỉnh giảm (Hao hụt / Hỏng)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="tx-wh">
                    Chọn kho hàng *
                  </label>
                  <select
                    id="tx-wh"
                    required
                    className="form-control"
                    value={txForm.warehouseId}
                    onChange={(e) => setTxForm({ ...txForm, warehouseId: e.target.value })}
                  >
                    <option value="">-- Chọn kho --</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.branchName})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="tx-item">
                    Chọn mặt hàng linh kiện *
                  </label>
                  <select
                    id="tx-item"
                    required
                    className="form-control"
                    value={txForm.inventoryItemId}
                    onChange={(e) => setTxForm({ ...txForm, inventoryItemId: e.target.value })}
                  >
                    <option value="">-- Chọn linh kiện --</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.sku} - {it.name} ({it.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="tx-qty">
                      Số lượng *
                    </label>
                    <input
                      id="tx-qty"
                      type="number"
                      min="1"
                      required
                      className="form-control"
                      placeholder="Số lượng..."
                      value={txForm.quantity}
                      onChange={(e) => setTxForm({ ...txForm, quantity: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="tx-cost">
                      Đơn giá vốn snapshot (VNĐ)
                    </label>
                    <input
                      id="tx-cost"
                      type="number"
                      min="0"
                      step="1000"
                      className="form-control"
                      placeholder="Để trống lấy giá mặc định"
                      value={txForm.unitCostSnapshot}
                      onChange={(e) => setTxForm({ ...txForm, unitCostSnapshot: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="tx-notes">
                    Ghi chú / Diễn giải
                  </label>
                  <textarea
                    id="tx-notes"
                    rows={2}
                    className="form-control"
                    placeholder="Số hóa đơn, nhà cung cấp, lý do kiểm kê..."
                    value={txForm.notes}
                    onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowTxModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Xác nhận giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

