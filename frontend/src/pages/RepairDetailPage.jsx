import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getCustomer } from '../api/customers.js';
import { getDevice } from '../api/devices.js';
import {
  addDiagnostic,
  addPart,
  adminDecideQuote,
  assignTechnician,
  createPayment,
  createQuote,
  createWarranty,
  decideQuote,
  getAssignments,
  getBilling,
  getDiagnostics,
  getParts,
  getPayments,
  getQuotes,
  getRepairOrder,
  getStatusHistory,
  getTechnicians,
  getWarranties,
  getWarrantyClaims,
  removePart,
  transitionStatus,
  voidPayment,
} from '../api/repairs.js';
import { getRepairLogs, createRepairLog } from '../api/repair-logs.js';
import {
  getPartsRequests,
  createPartsRequest,
  approvePartsRequest,
  rejectPartsRequest,
  issuePartsRequest,
} from '../api/parts-requests.js';
import { createInvoice, getInvoicePrintUrl } from '../api/invoices.js';
import { getInventoryItems } from '../api/inventory.js';
import EmptyState from '../components/EmptyState.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  formatCurrency,
  formatDate,
  getPaymentStatusInfo,
  getQuoteStatusInfo,
  getRepairStatusInfo,
  getPartsRequestStatusInfo,
} from '../utils/formatters.js';

export default function RepairDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, roles = [] } = useAuth();

  const canIntake = hasPermission ? hasPermission('intake.manage') : false;
  const canRepair = hasPermission ? (hasPermission('repair.manage') || hasPermission('operations.manage')) : false;
  const canManageOps = hasPermission ? hasPermission('operations.manage') : false;
  const isAdmin = roles.includes('ADMIN') || roles.includes('MANAGER') || canManageOps || (hasPermission && hasPermission('system.manage'));
  const canWarehouse = hasPermission ? (hasPermission('warehouse.manage') || hasPermission('inventory.manage') || roles.includes('ADMIN') || roles.includes('WAREHOUSE_MANAGER')) : false;
  const canBill = hasPermission ? (hasPermission('billing.manage') || hasPermission('intake.manage') || roles.includes('ACCOUNTANT') || roles.includes('ADMIN')) : false;

  // Core order state
  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [device, setDevice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Active tab: 'diagnostics' | 'quotes' | 'parts' | 'billing' | 'assignments' | 'warranty' | 'logs' | 'partsRequests'
  const [activeTab, setActiveTab] = useState('diagnostics');

  // Sub-data states
  const [technicians, setTechnicians] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [parts, setParts] = useState([]);
  const [repairLogs, setRepairLogs] = useState([]);
  const [partsRequests, setPartsRequests] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [billing, setBilling] = useState(null);
  const [payments, setPayments] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [warrantyClaims, setWarrantyClaims] = useState([]);

  // Modals for Logs & Parts Requests
  const [showLogModal, setShowLogModal] = useState(false);
  const [logForm, setLogForm] = useState({
    workPerformed: '',
    deviceCondition: '',
    rootCause: '',
    testResult: '',
    notes: '',
    imagesBefore: '',
    imagesAfter: '',
  });
  const [showPartsReqModal, setShowPartsReqModal] = useState(false);
  const [partsReqForm, setPartsReqForm] = useState({ inventoryItemId: '', quantityRequested: 1, reason: '', notes: '' });

  // Modals
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [statusOverride, setStatusOverride] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  const [showDiagModal, setShowDiagModal] = useState(false);
  const [diagForm, setDiagForm] = useState({ diagnosisText: '', recommendedAction: '', estimatedLabor: '' });

  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [isSupplementalQuote, setIsSupplementalQuote] = useState(false);
  const [quoteItems, setQuoteItems] = useState([
    { itemType: 'LABOR', description: 'Công sửa chữa / thay thế', quantity: 1, unitPrice: 0, discount: 0 },
  ]);
  const [quoteNotes, setQuoteNotes] = useState('');

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionQuoteId, setDecisionQuoteId] = useState(null);
  const [decisionType, setDecisionType] = useState('APPROVED');
  const [decisionContact, setDecisionContact] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  const [showAdminDecisionModal, setShowAdminDecisionModal] = useState(false);
  const [adminDecisionQuoteId, setAdminDecisionQuoteId] = useState(null);
  const [adminDecisionType, setAdminDecisionType] = useState('APPROVED');
  const [adminDecisionNote, setAdminDecisionNote] = useState('');

  const [showPartModal, setShowPartModal] = useState(false);
  const [partForm, setPartForm] = useState({ description: '', quantity: 1, unitCostSnapshot: 0, unitPrice: 0 });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', paymentMethod: 'CASH', notes: '' });

  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [warrantyForm, setWarrantyForm] = useState({ warrantyType: 'REPAIR', durationDays: 30, terms: 'Bảo hành linh kiện thay thế và lỗi kỹ thuật sửa chữa.' });

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    const orderRes = await getRepairOrder(id);
    if (orderRes.error) {
      setError(orderRes.error);
      setIsLoading(false);
      return;
    }
    const o = orderRes.data;
    setOrder(o);

    // Fetch related metadata
    const [cRes, dRes, techRes, asgRes, histRes, diagRes, quoteRes, partRes, billRes, payRes, warrRes, claimsRes, logRes, prRes, invRes] =
      await Promise.all([
        getCustomer(o.customerId),
        getDevice(o.deviceId),
        getTechnicians(),
        getAssignments(id),
        getStatusHistory(id),
        getDiagnostics(id),
        getQuotes(id),
        getParts(id),
        getBilling(id),
        getPayments(id),
        getWarranties(id),
        getWarrantyClaims(id),
        getRepairLogs(id),
        getPartsRequests({ repairOrderId: id }),
        getInventoryItems({ limit: 100 }),
      ]);

    if (!cRes.error) setCustomer(cRes.data);
    if (!dRes.error) setDevice(dRes.data);
    if (!techRes.error) setTechnicians(techRes.data.items || []);
    if (!asgRes.error) setAssignments(asgRes.data.items || []);
    if (!histRes.error) setStatusHistory(histRes.data.items || []);
    if (!diagRes.error) setDiagnostics(diagRes.data.items || []);
    if (!quoteRes.error) setQuotes(quoteRes.data.items || []);
    if (!partRes.error) setParts(partRes.data.items || []);
    if (!billRes.error) setBilling(billRes.data);
    if (!payRes.error) setPayments(payRes.data.items || []);
    if (!warrRes.error) setWarranties(warrRes.data.items || []);
    if (!claimsRes.error) setWarrantyClaims(claimsRes.data.items || []);
    if (!logRes.error) setRepairLogs(logRes.data?.items || []);
    if (!prRes.error) setPartsRequests(prRes.data?.items || []);
    if (!invRes.error) setInventoryItems(invRes.data?.items || []);

    setIsLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const showNotification = (msg) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Status transitions
  const triggerStatusTransition = (toStatus, needReason = false) => {
    setActionError(null);
    setPendingStatus(toStatus);
    setStatusReason('');
    setStatusOverride(false);
    if (needReason) {
      setShowStatusModal(true);
    } else {
      handleStatusChange(toStatus, '', false);
    }
  };

  const handleStatusChange = async (toStatus, reason, override) => {
    setShowStatusModal(false);
    setActionError(null);
    const res = await transitionStatus(id, {
      toStatus,
      reason: reason ? reason.trim() : undefined,
      override,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      showNotification(`Chuyển trạng thái sang "${getRepairStatusInfo(toStatus).label}" thành công!`);
      await loadAll();
    }
  };

  // Assignment
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedTechId) return;
    setActionError(null);
    const res = await assignTechnician(id, {
      technicianUserId: Number(selectedTechId),
      notes: assignNotes.trim() || undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowAssignModal(false);
      setSelectedTechId('');
      setAssignNotes('');
      showNotification('Đã phân công kỹ thuật viên thành công!');
      await loadAll();
    }
  };

  // Diagnostic
  const handleAddDiagnostic = async (e) => {
    e.preventDefault();
    setActionError(null);
    const res = await addDiagnostic(id, {
      diagnosisText: diagForm.diagnosisText.trim(),
      recommendedAction: diagForm.recommendedAction.trim() || undefined,
      estimatedLabor: diagForm.estimatedLabor ? Number(diagForm.estimatedLabor) : undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowDiagModal(false);
      setDiagForm({ diagnosisText: '', recommendedAction: '', estimatedLabor: '' });
      showNotification('Đã lưu kết quả chẩn đoán thành công!');
      await loadAll();
    }
  };

  // Quote
  const handleAddQuoteItem = () => {
    setQuoteItems([
      ...quoteItems,
      { itemType: 'PART', description: '', quantity: 1, unitPrice: 0, discount: 0 },
    ]);
  };

  const handleRemoveQuoteItem = (index) => {
    if (quoteItems.length === 1) return;
    setQuoteItems(quoteItems.filter((_, idx) => idx !== index));
  };

  const handleCreateQuote = async (e) => {
    e.preventDefault();
    setActionError(null);
    const items = quoteItems.map((it) => ({
      itemType: it.itemType,
      description: it.description.trim(),
      quantity: Number(it.quantity) || 1,
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
    }));
    const res = await createQuote(id, {
      items,
      isSupplemental: isSupplementalQuote,
      notes: quoteNotes.trim() || undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowQuoteModal(false);
      setIsSupplementalQuote(false);
      setQuoteItems([{ itemType: 'LABOR', description: 'Công sửa chữa / thay thế', quantity: 1, unitPrice: 0, discount: 0 }]);
      setQuoteNotes('');
      showNotification(isSupplementalQuote ? 'Đã lập báo giá bổ sung thành công, chuyển Admin thẩm định!' : 'Đã tạo bản báo giá thành công!');
      await loadAll();
    }
  };

  const handleDecideQuote = async (e) => {
    e.preventDefault();
    if (!decisionQuoteId) return;
    setActionError(null);
    const res = await decideQuote(id, decisionQuoteId, {
      decision: decisionType,
      customerContactName: decisionContact.trim() || undefined,
      note: decisionNote.trim() || undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowDecisionModal(false);
      setDecisionQuoteId(null);
      setDecisionContact('');
      setDecisionNote('');
      showNotification(`Báo giá đã được cập nhật: ${decisionType === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}`);
      await loadAll();
    }
  };

  const handleAdminDecideQuote = async (e) => {
    e.preventDefault();
    if (!adminDecisionQuoteId) return;
    setActionError(null);
    const res = await adminDecideQuote(id, adminDecisionQuoteId, {
      decision: adminDecisionType,
      note: adminDecisionNote.trim() || undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowAdminDecisionModal(false);
      setAdminDecisionQuoteId(null);
      setAdminDecisionNote('');
      showNotification(
        adminDecisionType === 'APPROVED'
          ? 'Đã duyệt báo giá! Hệ thống chuyển sang chờ khách hàng xác nhận.'
          : 'Đã từ chối báo giá và yêu cầu kỹ thuật viên chỉnh sửa lại.'
      );
      await loadAll();
    }
  };

  // Parts
  const handleAddPart = async (e) => {
    e.preventDefault();
    setActionError(null);
    const res = await addPart(id, {
      description: partForm.description.trim(),
      quantity: Number(partForm.quantity) || 1,
      unitCostSnapshot: Number(partForm.unitCostSnapshot) || 0,
      unitPrice: Number(partForm.unitPrice) || 0,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowPartModal(false);
      setPartForm({ description: '', quantity: 1, unitCostSnapshot: 0, unitPrice: 0 });
      showNotification('Đã thêm linh kiện sử dụng vào phiếu!');
      await loadAll();
    }
  };

  const handleRemovePart = async (partId) => {
    if (!window.confirm('Bạn có chắc chắn muốn gỡ linh kiện này khỏi phiếu?')) return;
    setActionError(null);
    const res = await removePart(id, partId);
    if (res.error) {
      setActionError(res.error);
    } else {
      showNotification('Đã gỡ linh kiện thành công!');
      await loadAll();
    }
  };

  // Payments
  const handleCreatePayment = async (e) => {
    e.preventDefault();
    setActionError(null);
    const res = await createPayment(id, {
      amount: Number(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      notes: paymentForm.notes.trim() || undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', paymentMethod: 'CASH', notes: '' });
      showNotification('Ghi nhận thanh toán thành công!');
      await loadAll();
    }
  };

  const handleVoidPayment = async (paymentId) => {
    const reason = window.prompt('Nhập lý do hủy khoản thanh toán này:');
    if (!reason) return;
    setActionError(null);
    const res = await voidPayment(id, paymentId, { reason });
    if (res.error) {
      setActionError(res.error);
    } else {
      showNotification('Đã hủy khoản thanh toán thành công!');
      await loadAll();
    }
  };

  // Warranty
  const handleCreateWarranty = async (e) => {
    e.preventDefault();
    setActionError(null);
    const startsAt = new Date().toISOString().slice(0, 10);
    const endsDate = new Date();
    endsDate.setDate(endsDate.getDate() + Number(warrantyForm.durationDays || 30));
    const endsAt = endsDate.toISOString().slice(0, 10);
    const res = await createWarranty(id, {
      startsAt,
      endsAt,
      terms: warrantyForm.terms.trim() || undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowWarrantyModal(false);
      showNotification('Đã cấp phiếu bảo hành thành công!');
      await loadAll();
    }
  };

  // Repair Logs
  const handleCreateLog = async (e) => {
    e.preventDefault();
    if (!logForm.workPerformed.trim()) return;
    setActionError(null);
    const imagesBefore = logForm.imagesBefore ? logForm.imagesBefore.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const imagesAfter = logForm.imagesAfter ? logForm.imagesAfter.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const res = await createRepairLog(id, {
      workPerformed: logForm.workPerformed.trim(),
      deviceCondition: logForm.deviceCondition.trim() || undefined,
      rootCause: logForm.rootCause.trim() || undefined,
      testResult: logForm.testResult.trim() || undefined,
      notes: logForm.notes.trim() || undefined,
      imagesBefore: imagesBefore.length > 0 ? imagesBefore : undefined,
      imagesAfter: imagesAfter.length > 0 ? imagesAfter : undefined,
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowLogModal(false);
      setLogForm({ workPerformed: '', deviceCondition: '', rootCause: '', testResult: '', notes: '', imagesBefore: '', imagesAfter: '' });
      showNotification('Ghi nhận nhật ký sửa chữa thành công!');
      await loadAll();
    }
  };

  // Parts Requests
  const handleCreatePartsRequest = async (e) => {
    e.preventDefault();
    if (!partsReqForm.inventoryItemId) return;
    setActionError(null);
    const res = await createPartsRequest({
      repairOrderId: Number(id),
      reason: partsReqForm.reason.trim() || undefined,
      notes: partsReqForm.notes.trim() || undefined,
      items: [
        {
          inventoryItemId: Number(partsReqForm.inventoryItemId),
          quantityRequested: Number(partsReqForm.quantityRequested || 1),
        },
      ],
    });
    if (res.error) {
      setActionError(res.error);
    } else {
      setShowPartsReqModal(false);
      setPartsReqForm({ inventoryItemId: '', quantityRequested: 1, reason: '', notes: '' });
      showNotification('Đã gửi yêu cầu cấp phát linh kiện tới thủ kho!');
      await loadAll();
    }
  };

  const handleApprovePartsRequest = async (reqId) => {
    setActionError(null);
    const res = await approvePartsRequest(reqId);
    if (res.error) {
      setActionError(res.error);
    } else {
      showNotification('Đã duyệt yêu cầu cấp phát linh kiện!');
      await loadAll();
    }
  };

  const handleRejectPartsRequest = async (reqId) => {
    const reason = window.prompt('Nhập lý do từ chối yêu cầu cấp phát:');
    if (!reason) return;
    setActionError(null);
    const res = await rejectPartsRequest(reqId, { rejectionReason: reason });
    if (res.error) {
      setActionError(res.error);
    } else {
      showNotification('Đã từ chối yêu cầu cấp phát!');
      await loadAll();
    }
  };

  const handleIssuePartsRequest = async (reqId) => {
    if (!window.confirm('Xác nhận xuất kho cho yêu cầu này? Số lượng tồn kho sẽ tự động trừ.')) return;
    setActionError(null);
    const res = await issuePartsRequest(reqId);
    if (res.error) {
      setActionError(res.error);
    } else {
      showNotification('Xuất kho thành công! Linh kiện đã được trừ kho và thêm vào phiếu.');
      await loadAll();
    }
  };

  // Invoices
  const handleCreateAndPrintInvoice = async () => {
    setActionError(null);
    const res = await createInvoice(id);
    if (res.error) {
      setActionError(res.error);
    } else {
      const invId = res.data.id;
      const url = getInvoicePrintUrl(invId);
      window.open(url, '_blank');
      showNotification(`Đã tạo hóa đơn ${res.data.invoiceNumber}! Trang in đã được mở.`);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Đang tải thông tin phiếu sửa chữa..." />;
  }

  if (error || !order) {
    return (
      <div className="page">
        <ErrorMessage message={error || 'Không tìm thấy phiếu sửa chữa'} onRetry={loadAll} />
      </div>
    );
  }

  const statusInfo = getRepairStatusInfo(order.repairStatus);
  const isTerminal = ['CANCELLED', 'DELIVERED', 'UNREPAIRABLE', 'REJECTED'].includes(order.repairStatus);

  return (
    <div className="page">
      {/* Notifications */}
      {actionSuccess && <div className="toast toast--success">{actionSuccess}</div>}
      {actionError && <ErrorMessage message={actionError} />}

      {/* Banner nếu đơn bị lễ tân từ chối */}
      {order.repairStatus === 'REJECTED' && (
        <div className="alert alert--danger mb-4 p-3 rounded">
          <strong>❌ Đơn sửa chữa này đã bị Lễ tân từ chối tiếp nhận (Giai đoạn 2).</strong>
          {order.rejectionReason && (
            <div className="mt-1 text-sm">
              Lý do từ chối: <em>"{order.rejectionReason}"</em>
            </div>
          )}
        </div>
      )}

      {/* Header Info */}
      <div className="card repair-header-card">
        <div className="repair-header-card__top">
          <div>
            <div className="repair-code-wrap">
              <span className="repair-code">{order.code}</span>
              <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
              {order.originalRepairOrderId && (
                <span className="badge badge--warning">
                  Phiếu bảo hành lại (Gốc #{order.originalRepairOrderId})
                </span>
              )}
            </div>
            <p className="repair-header-dates">
              Tiếp nhận: <strong>{formatDate(order.receivedAt)}</strong> | Hẹn trả:{' '}
              <strong>{formatDate(order.promisedAt)}</strong>
              {order.completedAt && (
                <> | Hoàn tất: <strong>{formatDate(order.completedAt)}</strong></>
              )}
              {order.deliveredAt && (
                <> | Đã giao: <strong>{formatDate(order.deliveredAt)}</strong></>
              )}
            </p>
          </div>
          <div className="repair-header-actions">
            <button type="button" className="btn btn--outline" onClick={() => navigate('/repairs')}>
              ← Về danh sách
            </button>
          </div>
        </div>

        {/* Customer & Device quick snippet */}
        <div className="repair-meta-grid">
          <div className="repair-meta-col">
            <small className="text-muted">KHÁCH HÀNG</small>
            <div className="font-semibold">{customer?.fullName || `KH #${order.customerId}`}</div>
            <div>{customer?.phoneNumber}</div>
            {customer?.address && <div className="text-sm text-muted">{customer.address}</div>}
          </div>
          <div className="repair-meta-col">
            <small className="text-muted">THIẾT BỊ</small>
            <div className="font-semibold">
              {device ? `${device.deviceType} - ${device.brand || ''} ${device.model || ''}` : `TB #${order.deviceId}`}
            </div>
            {device?.serialNumber && <div>S/N: <code>{device.serialNumber}</code></div>}
          </div>
          <div className="repair-meta-col">
            <small className="text-muted">KỸ THUẬT VIÊN PHỤ TRÁCH</small>
            <div className="font-semibold">
              {order.assignedTechnicianName ? (
                <span className="tech-badge">{order.assignedTechnicianName}</span>
              ) : (
                <span className="text-warning">Chưa có ai nhận</span>
              )}
            </div>
            {canManageOps && !isTerminal && (
              <button
                type="button"
                className="btn btn--secondary btn--sm mt-1"
                onClick={() => setShowAssignModal(true)}
              >
                {order.assignedTechnicianId ? 'Đổi kỹ thuật viên' : '+ Phân công KTV'}
              </button>
            )}
          </div>
        </div>

        {/* Issue & Condition */}
        <div className="repair-notes-strip">
          <div>
            <strong>Lỗi phản ánh:</strong> {order.reportedIssue}
          </div>
          {order.intakeCondition && (
            <div>
              <strong>Tình trạng tiếp nhận:</strong> {order.intakeCondition}
            </div>
          )}
          {order.notes && (
            <div>
              <strong>Ghi chú nội bộ:</strong> {order.notes}
            </div>
          )}
        </div>

        {/* Workflow Transition Buttons */}
        {!isTerminal && (
          <div className="workflow-action-bar">
            <span className="workflow-action-title">Tiến trình xử lý tiếp theo:</span>

            {/* Giai đoạn 1 -> Giai đoạn 2: PENDING / PENDING_RECEPTION -> ACCEPTED / REJECTED */}
            {(order.repairStatus === 'PENDING' || order.repairStatus === 'PENDING_RECEPTION') && (
              <>
                <button
                  type="button"
                  className="btn btn--primary font-semibold mr-2"
                  onClick={() => triggerStatusTransition('ACCEPTED')}
                >
                  ✅ Lễ tân chấp nhận đơn (ACCEPTED)
                </button>
                <button
                  type="button"
                  className="btn btn--outline-danger font-semibold"
                  onClick={() => triggerStatusTransition('REJECTED', true)}
                >
                  ❌ Từ chối đơn (REJECTED)
                </button>
              </>
            )}

            {/* Giai đoạn 2 -> Giai đoạn 3: ACCEPTED / RECEIVED -> Chờ Admin phân công KTV */}
            {(order.repairStatus === 'ACCEPTED' || order.repairStatus === 'RECEIVED') && (
              <>
                <span className="badge badge--info text-sm p-2 mr-2">
                  📥 Đơn đã tiếp nhận — Chờ Admin phân công Kỹ thuật viên (GĐ 3)
                </span>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setActiveTab('assignments')}
                >
                  👔 Phân công Kỹ thuật viên
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => triggerStatusTransition('DIAGNOSING')}
                >
                  🔬 Chẩn đoán lỗi thiết bị
                </button>
              </>
            )}

            {/* Bước 3: ASSIGNED -> Chẩn đoán / Báo giá */}
            {order.repairStatus === 'ASSIGNED' && (
              <>
                <button
                  type="button"
                  className="btn btn--primary font-semibold"
                  onClick={() => {
                    setActiveTab('quotes');
                    setShowQuoteModal(true);
                  }}
                >
                  📋 Lập báo giá gửi khách hàng
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => triggerStatusTransition('DIAGNOSING')}
                >
                  🔬 Chẩn đoán lỗi
                </button>
                <span className="text-warning text-sm font-semibold ml-2">
                  ⚠️ Báo giá xong khách chấp nhận thì mới sửa
                </span>
              </>
            )}

            {order.repairStatus === 'DIAGNOSING' && (
              <>
                <button
                  type="button"
                  className="btn btn--primary font-semibold"
                  onClick={() => {
                    setActiveTab('quotes');
                    setShowQuoteModal(true);
                  }}
                >
                  📋 Lập báo giá gửi khách hàng
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => setActiveTab('quotes')}
                >
                  Xem danh sách báo giá
                </button>
              </>
            )}

            {order.repairStatus === 'AWAITING_ADMIN_APPROVAL' && (
              <>
                <span className="badge badge--warning text-sm p-2 mr-2">
                  ⚖️ GĐ 5: Báo giá đang chờ Admin thẩm định & phê duyệt
                </span>
                <button
                  type="button"
                  className="btn btn--primary font-semibold"
                  onClick={() => setActiveTab('quotes')}
                >
                  📋 Thẩm định báo giá ngay
                </button>
              </>
            )}

            {(order.repairStatus === 'AWAITING_CUSTOMER_APPROVAL' || order.repairStatus === 'WAITING_APPROVAL') && (
              <>
                <span className="badge badge--info text-sm p-2 mr-2">
                  ⏳ GĐ 6: Admin đã duyệt — Đang chờ khách hàng xác nhận (Portal / Điện thoại)
                </span>
                <button
                  type="button"
                  className="btn btn--primary font-semibold"
                  onClick={() => setActiveTab('quotes')}
                >
                  📋 Xem báo giá & Ghi nhận duyệt
                </button>
              </>
            )}

            {order.repairStatus === 'APPROVED' && (
              <>
                <span className="badge badge--success text-sm p-2 mr-2">
                  ✅ Khách hàng đã chấp thuận báo giá
                </span>
                <button
                  type="button"
                  className="btn btn--primary font-semibold"
                  onClick={() => triggerStatusTransition('IN_PROGRESS')}
                >
                  ▶ Bắt đầu sửa chữa (IN_PROGRESS)
                </button>
              </>
            )}

            {/* Giai đoạn 7: KTV Thực hiện sửa chữa (IN_PROGRESS) */}
            {(order.repairStatus === 'IN_PROGRESS' || order.repairStatus === 'REPAIRING') && (
              <>
                <span className="badge badge--primary text-sm p-2 mr-2">
                  🔧 GĐ 7: Đang tiến hành sửa chữa theo phương án đã duyệt
                </span>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setActiveTab('logs');
                    setShowLogModal(true);
                  }}
                >
                  📝 Ghi nhật ký & ảnh
                </button>
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setActiveTab('partsRequests');
                    setShowPartsReqModal(true);
                  }}
                >
                  📦 Yêu cầu linh kiện kho (GĐ 8)
                </button>
                <button
                  type="button"
                  className="btn btn--warning btn--sm font-semibold"
                  onClick={() => {
                    setActiveTab('quotes');
                    setIsSupplementalQuote(true);
                    setShowQuoteModal(true);
                  }}
                >
                  ⚡ Báo giá bổ sung
                </button>
                <button
                  type="button"
                  className="btn btn--success font-semibold"
                  onClick={() => triggerStatusTransition('COMPLETED')}
                >
                  ✔ Hoàn thành sửa chữa (GĐ 9)
                </button>
              </>
            )}

            {/* Giai đoạn 8: WAITING_PARTS */}
            {order.repairStatus === 'WAITING_PARTS' && (
              <>
                <span className="badge badge--warning text-sm p-2 mr-2">
                  📦 GĐ 8: Đang chờ Thủ kho duyệt & xuất linh kiện
                </span>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setActiveTab('partsRequests')}
                >
                  🔍 Xem yêu cầu cấp phát kho
                </button>
                <button
                  type="button"
                  className="btn btn--warning btn--sm font-semibold"
                  onClick={() => {
                    setActiveTab('quotes');
                    setIsSupplementalQuote(true);
                    setShowQuoteModal(true);
                  }}
                >
                  ⚡ Báo giá bổ sung phát sinh
                </button>
              </>
            )}

            {/* Bước 6 -> Bước 7: WAITING_PAYMENT */}
            {order.repairStatus === 'WAITING_PAYMENT' && (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => setActiveTab('billing')}
                >
                  💳 Mở tab Thu tiền & Hóa đơn
                </button>
                <button
                  type="button"
                  className="btn btn--success font-semibold"
                  onClick={() => triggerStatusTransition('COMPLETED')}
                >
                  ✔ Hoàn tất sửa chữa (GĐ 9)
                </button>
              </>
            )}

            {/* Giai đoạn 9: COMPLETED -> Chờ Kế toán thu tiền */}
            {order.repairStatus === 'COMPLETED' && (
              <>
                <span className="badge badge--success text-sm p-2 mr-2">
                  ✅ GĐ 9: Đã hoàn tất sửa chữa — Chờ Kế toán lập hóa đơn & thu tiền
                </span>
                <button
                  type="button"
                  className="btn btn--primary font-semibold"
                  onClick={() => setActiveTab('billing')}
                >
                  💳 Thu tiền & Lập hóa đơn (GĐ 10)
                </button>
              </>
            )}

            {/* Giai đoạn 10: PAID -> Bàn giao */}
            {order.repairStatus === 'PAID' && (
              <>
                <span className="badge badge--info text-sm p-2 mr-2">
                  💳 GĐ 10: Đã thanh toán đầy đủ {order.paidAt ? `(${formatDate(order.paidAt)})` : ''}
                </span>
                <button
                  type="button"
                  className="btn btn--outline font-semibold"
                  onClick={() => setActiveTab('billing')}
                >
                  📄 Xem hóa đơn & Biên lai
                </button>
                <button
                  type="button"
                  className="btn btn--success font-semibold"
                  onClick={() => triggerStatusTransition('DELIVERED')}
                >
                  🚚 Bàn giao thiết bị cho khách (DELIVERED)
                </button>
              </>
            )}

            {order.repairStatus === 'READY_FOR_PICKUP' && (
              <button
                type="button"
                className="btn btn--success"
                onClick={() => triggerStatusTransition('DELIVERED')}
              >
                🎁 Bàn giao máy cho khách
              </button>
            )}

            {/* Cancel & Unrepairable buttons */}
            <button
              type="button"
              className="btn btn--outline-danger btn--sm ml-auto"
              onClick={() => triggerStatusTransition('CANCELLED', true)}
            >
              Hủy sửa chữa
            </button>
            <button
              type="button"
              className="btn btn--outline-danger btn--sm"
              onClick={() => triggerStatusTransition('UNREPAIRABLE', true)}
            >
              Báo không thể sửa
            </button>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="tabs-header">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'diagnostics' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('diagnostics')}
        >
          🔬 Chẩn đoán ({diagnostics.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'quotes' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('quotes')}
        >
          📋 Báo giá ({quotes.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'parts' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('parts')}
        >
          ⚙️ Linh kiện ({parts.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'billing' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          💳 Thanh toán & Công nợ ({payments.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'assignments' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('assignments')}
        >
          👥 Phân công & Lịch sử ({statusHistory.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'warranty' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('warranty')}
        >
          🛡️ Bảo hành ({warranties.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'logs' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📝 Nhật ký sửa ({repairLogs.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'partsRequests' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('partsRequests')}
        >
          📦 Cấp phát kho ({partsRequests.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="tab-content">
        {/* TAB 1: DIAGNOSTICS */}
        {activeTab === 'diagnostics' && (
          <div className="card">
            <div className="section-header">
              <h3 className="card__title">Kết quả chẩn đoán kỹ thuật</h3>
              {canRepair && !isTerminal && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowDiagModal(true)}
                >
                  + Thêm kết quả chẩn đoán
                </button>
              )}
            </div>

            {diagnostics.length === 0 ? (
              <EmptyState
                title="Chưa có biên bản chẩn đoán"
                message="Kỹ thuật viên phụ trách chưa ghi nhận kết luận chẩn đoán hư hỏng của thiết bị."
                action={
                  canRepair && !isTerminal && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setShowDiagModal(true)}
                    >
                      Nhập chẩn đoán ngay
                    </button>
                  )
                }
              />
            ) : (
              <div className="timeline">
                {diagnostics.map((diag) => (
                  <div key={diag.id} className="timeline-item">
                    <div className="timeline-item__badge">🔬</div>
                    <div className="timeline-item__content">
                      <div className="timeline-item__header">
                        <strong>KTV: {diag.diagnosedByName}</strong>
                        <span className="text-muted text-sm">{formatDate(diag.diagnosedAt)}</span>
                      </div>
                      <div className="timeline-item__body">
                        <p><strong>Kết luận:</strong> {diag.diagnosisText}</p>
                        {diag.recommendedAction && (
                          <p><strong>Hướng giải quyết:</strong> {diag.recommendedAction}</p>
                        )}
                        {diag.estimatedLabor > 0 && (
                          <p><strong>Ước tính công thợ:</strong> {formatCurrency(diag.estimatedLabor)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUOTES */}
        {activeTab === 'quotes' && (
          <div className="card">
            <div className="section-header">
              <h3 className="card__title">Danh sách báo giá khách hàng</h3>
              {canRepair && !isTerminal && (
                <div className="d-flex gap-2">
                  {(order.repairStatus === 'IN_PROGRESS' || order.repairStatus === 'WAITING_PARTS') && (
                    <button
                      type="button"
                      className="btn btn--warning btn--sm font-semibold"
                      onClick={() => {
                        setIsSupplementalQuote(true);
                        setShowQuoteModal(true);
                      }}
                    >
                      ⚡ + Lập báo giá bổ sung (Phát sinh)
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      setIsSupplementalQuote(false);
                      setShowQuoteModal(true);
                    }}
                  >
                    + Tạo báo giá mới
                  </button>
                </div>
              )}
            </div>

            {quotes.length === 0 ? (
              <EmptyState
                title="Chưa có báo giá nào"
                message="Chưa có bản báo giá sửa chữa / linh kiện nào được lập cho phiếu này."
                action={
                  canRepair && !isTerminal && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => {
                        setIsSupplementalQuote(false);
                        setShowQuoteModal(true);
                      }}
                    >
                      Lập báo giá đầu tiên
                    </button>
                  )
                }
              />
            ) : (
              <div className="quotes-list">
                {quotes.map((q) => {
                  const quoteStatusVal = q.status || q.quoteStatus;
                  const qStatus = getQuoteStatusInfo(quoteStatusVal);
                  const isPending =
                    quoteStatusVal === 'SENT' ||
                    quoteStatusVal === 'DRAFT' ||
                    quoteStatusVal === 'PENDING_CUSTOMER';
                  const adminStatus = q.adminApprovalStatus || 'PENDING';

                  return (
                    <div key={q.id} className="quote-box">
                      <div className="quote-box__header">
                        <div>
                          <strong>Báo giá v{q.versionNo || q.version || 1}</strong> (Mã: #{q.id})
                          {Boolean(q.isSupplemental) && (
                            <span className="badge badge--warning ml-2 font-semibold">
                              ⚡ Báo giá bổ sung
                            </span>
                          )}
                          <span className={`badge ${qStatus.className} ml-2`}>{qStatus.label}</span>
                          {/* Badge Admin approval */}
                          {adminStatus === 'APPROVED' && (
                            <span className="badge badge--success ml-2">
                              ✅ Admin đã duyệt {q.adminApprovedByName ? `(${q.adminApprovedByName})` : ''}
                            </span>
                          )}
                          {adminStatus === 'REJECTED' && (
                            <span className="badge badge--danger ml-2">
                              ❌ Admin yêu cầu sửa: {q.adminRejectNote || 'Chỉnh sửa lại'}
                            </span>
                          )}
                          {adminStatus === 'PENDING' && (
                            <span className="badge badge--warning ml-2">
                              ⏳ Chờ Admin thẩm định (GĐ 5)
                            </span>
                          )}
                        </div>
                        <div className="quote-box__total">
                          Tổng cộng: <span>{formatCurrency(q.totalAmount)}</span>
                        </div>
                      </div>

                      <div className="quote-box__meta">
                        <span>Lập bởi: {q.createdByName} lúc {formatDate(q.createdAt)}</span>
                        {q.adminApprovedAt && <span> | Admin duyệt lúc: {formatDate(q.adminApprovedAt)}</span>}
                        {q.customerContactName && <span> | Người duyệt: {q.customerContactName}</span>}
                        {q.decisionNote && <span> | Ghi chú phản hồi: "{q.decisionNote}"</span>}
                      </div>

                      {/* Items table */}
                      <table className="table table--compact mt-2">
                        <thead>
                          <tr>
                            <th>Loại</th>
                            <th>Mô tả</th>
                            <th className="text-right">SL</th>
                            <th className="text-right">Đơn giá</th>
                            <th className="text-right">Giảm giá</th>
                            <th className="text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(q.items || []).map((it) => (
                            <tr key={it.id || it.description}>
                              <td>
                                <span className={`badge ${it.itemType === 'PART' ? 'badge--info' : 'badge--primary'}`}>
                                  {it.itemType === 'PART' ? 'Linh kiện' : 'Tiền công'}
                                </span>
                              </td>
                              <td>{it.description}</td>
                              <td className="text-right">{it.quantity}</td>
                              <td className="text-right">{formatCurrency(it.unitPrice)}</td>
                              <td className="text-right">{formatCurrency(it.discount)}</td>
                              <td className="text-right font-semibold">{formatCurrency(it.lineTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* TẦNG 1: Thao tác thẩm định của Admin */}
                      {isAdmin && !isTerminal && isPending && adminStatus === 'PENDING' && (
                        <div className="alert alert--warning mt-3 p-3 d-flex flex-wrap justify-content-between align-items-center gap-2 rounded border">
                          <div>
                            <div className="font-semibold text-warning-dark">
                              ⚖️ Báo giá chờ Quản trị viên thẩm định & phê duyệt
                            </div>
                            <div className="text-sm text-muted">
                              Kiểm tra phương án kỹ thuật và chi phí trước khi chuyển tiếp cho khách hàng xác nhận.
                            </div>
                          </div>
                          <div className="d-flex gap-2">
                            <button
                              type="button"
                              className="btn btn--success btn--sm font-semibold"
                              onClick={() => {
                                setAdminDecisionQuoteId(q.id);
                                setAdminDecisionType('APPROVED');
                                setAdminDecisionNote('');
                                setShowAdminDecisionModal(true);
                              }}
                            >
                              ✅ Duyệt báo giá (Gửi khách hàng)
                            </button>
                            <button
                              type="button"
                              className="btn btn--outline-danger btn--sm"
                              onClick={() => {
                                setAdminDecisionQuoteId(q.id);
                                setAdminDecisionType('REJECTED');
                                setAdminDecisionNote('');
                                setShowAdminDecisionModal(true);
                              }}
                            >
                              ↩️ Yêu cầu KTV sửa lại
                            </button>
                          </div>
                        </div>
                      )}

                      {/* TẦNG 2: Quyết định của Khách hàng (hoặc Nhân viên ghi nhận qua điện thoại) */}
                      {!isTerminal && isPending && (
                        <div className="quote-box__actions mt-3 pt-2 border-top">
                          {adminStatus === 'APPROVED' ? (
                            <>
                              <button
                                type="button"
                                className="btn btn--success btn--sm"
                                onClick={() => {
                                  setDecisionQuoteId(q.id);
                                  setDecisionType('APPROVED');
                                  setShowDecisionModal(true);
                                }}
                              >
                                ✔ Khách đồng ý (Phê duyệt)
                              </button>
                              <button
                                type="button"
                                className="btn btn--danger btn--sm"
                                onClick={() => {
                                  setDecisionQuoteId(q.id);
                                  setDecisionType('REJECTED');
                                  setShowDecisionModal(true);
                                }}
                              >
                                ✖ Khách từ chối báo giá
                              </button>
                            </>
                          ) : adminStatus === 'REJECTED' ? (
                            <span className="text-danger text-sm font-semibold">
                              ↩️ Báo giá này đã bị Admin yêu cầu điều chỉnh. KTV vui lòng tạo phiên bản mới.
                            </span>
                          ) : (
                            <span className="text-warning-dark text-sm font-semibold">
                              ⚠️ Đang chờ Quản trị viên duyệt trước khi gửi khách hàng phê duyệt.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PARTS */}
        {activeTab === 'parts' && (
          <div className="card">
            <div className="section-header">
              <h3 className="card__title">Linh kiện & Phụ tùng sử dụng</h3>
              {canRepair && !isTerminal && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowPartModal(true)}
                >
                  + Thêm linh kiện vào phiếu
                </button>
              )}
            </div>

            {parts.length === 0 ? (
              <EmptyState
                title="Chưa sử dụng linh kiện nào"
                message="Chưa có phụ tùng hoặc vật tư nào được ghi nhận cho phiếu sửa chữa này."
                action={
                  canRepair && !isTerminal && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setShowPartModal(true)}
                    >
                      Thêm linh kiện
                    </button>
                  )
                }
              />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mô tả linh kiện</th>
                    <th className="text-right">Số lượng</th>
                    <th className="text-right">Giá bán</th>
                    <th className="text-right">Thành tiền</th>
                    <th>Người thêm</th>
                    <th>Ngày thêm</th>
                    {!isTerminal && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p) => (
                    <tr key={p.id}>
                      <td className="font-semibold">{p.description}</td>
                      <td className="text-right">{p.quantity}</td>
                      <td className="text-right">{formatCurrency(p.unitPrice)}</td>
                      <td className="text-right font-semibold">{formatCurrency(p.lineTotal)}</td>
                      <td>{p.addedByName}</td>
                      <td><small>{formatDate(p.createdAt)}</small></td>
                      {!isTerminal && (
                        <td>
                          {canRepair && (
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              onClick={() => handleRemovePart(p.id)}
                            >
                              Gỡ
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 4: BILLING & PAYMENTS */}
        {activeTab === 'billing' && (
          <div className="card">
            <div className="section-header">
              <h3 className="card__title">Thanh toán & Công nợ</h3>
              <div className="header-button-group">
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={handleCreateAndPrintInvoice}
                >
                  🖨 In / Xuất hóa đơn PDF
                </button>
                {(canIntake || canBill) && !isTerminal && (
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      if (billing && billing.balanceDue > 0) {
                        setPaymentForm({ amount: String(billing.balanceDue), paymentMethod: 'CASH', notes: '' });
                      }
                      setShowPaymentModal(true);
                    }}
                  >
                    + Thu tiền / Thêm thanh toán (Kế toán)
                  </button>
                )}
              </div>
            </div>

            {/* Banner Đã thanh toán đầy đủ */}
            {order.repairStatus === 'PAID' && (
              <div className="alert alert--success mb-3 p-3 rounded d-flex justify-content-between align-items-center">
                <div>
                  <strong className="text-success-dark">💳 ĐÃ HOÀN TẤT THANH TOÁN (GIAI ĐOẠN 10)</strong>
                  <div className="text-sm text-muted">
                    Khách hàng đã thanh toán đầy đủ 100% {order.paidAt ? `lúc ${formatDate(order.paidAt)}` : ''}. Sẵn sàng bàn giao thiết bị.
                  </div>
                </div>
                <span className="badge badge--success font-semibold p-2">PAID</span>
              </div>
            )}

            {/* Billing Summary Cards */}
            {billing && (
              <div className="billing-summary-grid">
                <div className="billing-card">
                  <small className="text-muted">TỔNG CHI PHÍ</small>
                  <div className="billing-amount">{formatCurrency(billing.totalAmount)}</div>
                  <div className="text-sm text-muted">
                    Công: {formatCurrency(billing.laborTotal)} | Phụ tùng: {formatCurrency(billing.partsTotal)}
                  </div>
                </div>
                <div className="billing-card">
                  <small className="text-muted">ĐÃ THANH TOÁN</small>
                  <div className="billing-amount text-success">{formatCurrency(billing.totalPaid)}</div>
                  <div className="text-sm text-muted">Đã ghi nhận vào quỹ</div>
                </div>
                <div className="billing-card">
                  <small className="text-muted">CÒN PHẢI THU</small>
                  <div className="billing-amount text-danger">{formatCurrency(billing.balanceDue)}</div>
                  <div>
                    <span className={`badge ${getPaymentStatusInfo(billing.paymentStatus).className}`}>
                      {getPaymentStatusInfo(billing.paymentStatus).label}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <h4 className="section-title mt-4">Lịch sử thu tiền ({payments.length})</h4>
            {payments.length === 0 ? (
              <EmptyState
                title="Chưa có khoản thanh toán nào"
                message="Phiếu này chưa phát sinh giao dịch thu tiền."
              />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã GD</th>
                    <th>Số tiền</th>
                    <th>Phương thức</th>
                    <th>Trạng thái</th>
                    <th>Người thu</th>
                    <th>Ngày thu</th>
                    <th>Ghi chú</th>
                    {canManageOps && <th>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((pm) => (
                    <tr key={pm.id} className={pm.voidedAt ? 'row--dimmed' : ''}>
                      <td>#{pm.id}</td>
                      <td className="font-semibold">{formatCurrency(pm.amount)}</td>
                      <td>
                        <span className="badge badge--neutral">{pm.paymentMethod}</span>
                      </td>
                      <td>
                        {pm.voidedAt ? (
                          <span className="badge badge--danger" title={`Lý do: ${pm.voidReason}`}>
                            Đã hủy lúc {formatDate(pm.voidedAt)}
                          </span>
                        ) : (
                          <span className="badge badge--success">Thành công</span>
                        )}
                      </td>
                      <td>{pm.receivedByName}</td>
                      <td><small>{formatDate(pm.receivedAt)}</small></td>
                      <td>{pm.notes || '—'}</td>
                      {canManageOps && (
                        <td>
                          {!pm.voidedAt && (
                            <button
                              type="button"
                              className="btn btn--danger btn--sm"
                              onClick={() => handleVoidPayment(pm.id)}
                            >
                              Hủy GD
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 5: ASSIGNMENTS & STATUS HISTORY */}
        {activeTab === 'assignments' && (
          <div className="split-view">
            {/* Left: Assignments */}
            <div className="card split-view__left">
              <div className="section-header">
                <h3 className="card__title">Lịch sử phân công ({assignments.length})</h3>
                {canManageOps && !isTerminal && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setShowAssignModal(true)}
                  >
                    + Phân công
                  </button>
                )}
              </div>
              {assignments.length === 0 ? (
                <EmptyState title="Chưa phân công" message="Phiếu này chưa từng phân công cho kỹ thuật viên nào." />
              ) : (
                <div className="assignment-list">
                  {assignments.map((a) => (
                    <div key={a.id} className={`assignment-item ${a.isActive ? 'assignment-item--active' : ''}`}>
                      <div className="assignment-item__name">
                        <strong>{a.technicianName}</strong>
                        {a.isActive && <span className="badge badge--success ml-2">Đang phụ trách</span>}
                      </div>
                      <div className="text-sm text-muted">
                        Phân công bởi: {a.assignedByName} ({formatDate(a.assignedAt)})
                      </div>
                      {a.unassignedAt && (
                        <div className="text-sm text-danger">Hết phụ trách: {formatDate(a.unassignedAt)}</div>
                      )}
                      {a.notes && <div className="text-sm mt-1">{a.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Status Timeline */}
            <div className="card split-view__right">
              <h3 className="card__title">Lịch sử trạng thái ({statusHistory.length})</h3>
              {statusHistory.length === 0 ? (
                <EmptyState title="Chưa có lịch sử" message="Không có thông tin lịch sử trạng thái." />
              ) : (
                <div className="timeline">
                  {statusHistory.map((h) => {
                    const fromInfo = h.fromStatus ? getRepairStatusInfo(h.fromStatus) : null;
                    const toInfo = getRepairStatusInfo(h.toStatus);
                    return (
                      <div key={h.id} className="timeline-item">
                        <div className="timeline-item__badge">●</div>
                        <div className="timeline-item__content">
                          <div className="timeline-item__header">
                            <div>
                              {fromInfo && <span className={`badge ${fromInfo.className} mr-1`}>{fromInfo.label}</span>}
                              ➜ <span className={`badge ${toInfo.className} ml-1`}>{toInfo.label}</span>
                            </div>
                            <span className="text-muted text-sm">{formatDate(h.createdAt)}</span>
                          </div>
                          <div className="text-sm mt-1">
                            Người thực hiện: <strong>{h.changedByName}</strong>
                            {h.override && <span className="badge badge--warning ml-2">Ghi đè bởi Quản lý</span>}
                          </div>
                          {h.reason && <p className="text-sm text-muted mt-1">Lý do: {h.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: WARRANTY */}
        {activeTab === 'warranty' && (
          <div className="card">
            <div className="section-header">
              <h3 className="card__title">Bảo hành sau sửa chữa</h3>
              {canRepair && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowWarrantyModal(true)}
                >
                  + Cấp thẻ bảo hành mới
                </button>
              )}
            </div>

            {warranties.length === 0 ? (
              <EmptyState
                title="Chưa cấp phiếu bảo hành"
                message="Chưa có phiếu bảo hành nào được kích hoạt cho thiết bị này."
                action={
                  canRepair && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setShowWarrantyModal(true)}
                    >
                      Cấp thẻ bảo hành ngay
                    </button>
                  )
                }
              />
            ) : (
              <div className="warranty-grid">
                {warranties.map((w) => (
                  <div key={w.id} className="warranty-card">
                    <div className="warranty-card__header">
                      <span className="badge badge--success">{w.warrantyType}</span>
                      <strong className="warranty-card__code">{w.warrantyCode}</strong>
                    </div>
                    <div className="warranty-card__body">
                      <div>Thời hạn: <strong>{w.durationDays} ngày</strong></div>
                      <div>Bắt đầu: {formatDate(w.startsAt)}</div>
                      <div>Hết hạn: <strong>{formatDate(w.endsAt)}</strong></div>
                      {w.terms && <p className="warranty-card__terms mt-2"><strong>Điều khoản:</strong> {w.terms}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h4 className="section-title mt-4">Các lượt bảo hành lại liên quan ({warrantyClaims.length})</h4>
            {warrantyClaims.length === 0 ? (
              <p className="text-muted text-sm">Chưa có lượt bảo hành lại nào từ phiếu này.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã phiếu mới</th>
                    <th>Trạng thái</th>
                    <th>Lỗi phản ánh</th>
                    <th>Ngày tiếp nhận</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {warrantyClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td className="font-semibold">{claim.code}</td>
                      <td>
                        <span className={`badge ${getRepairStatusInfo(claim.repairStatus).className}`}>
                          {getRepairStatusInfo(claim.repairStatus).label}
                        </span>
                      </td>
                      <td>{claim.reportedIssue}</td>
                      <td>{formatDate(claim.receivedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => navigate(`/repairs/${claim.id}`)}
                        >
                          Xem phiếu ➔
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* TAB 7: REPAIR LOGS */}
        {activeTab === 'logs' && (
          <div className="card">
            <div className="section-header">
              <h3 className="card__title">Nhật ký tiến trình sửa chữa thiết bị</h3>
              {canRepair && !isTerminal && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowLogModal(true)}
                >
                  + Thêm nhật ký sửa chữa
                </button>
              )}
            </div>

            {repairLogs.length === 0 ? (
              <EmptyState
                title="Chưa có nhật ký sửa chữa"
                message="Kỹ thuật viên chưa ghi nhật ký công việc thực tế cho phiếu này."
                action={
                  canRepair && !isTerminal && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setShowLogModal(true)}
                    >
                      Ghi nhật ký đầu tiên
                    </button>
                  )
                }
              />
            ) : (
              <div className="repair-logs-list">
                {repairLogs.map((log) => (
                  <div key={log.id} className="log-item-card mb-3 p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <strong>👨‍🔧 {log.technicianName || 'Kỹ thuật viên'}</strong>
                        <span className="text-muted text-sm ml-2">lúc {formatDate(log.performedAt)}</span>
                      </div>
                      <span className="badge badge--info">Nhật ký #{log.id}</span>
                    </div>

                    <div className="log-detail-section mb-2">
                      <strong className="text-primary">🛠 Công việc đã thực hiện:</strong>
                      <p className="mt-1 mb-2 font-semibold">{log.workPerformed}</p>
                    </div>

                    <div className="grid-2-cols gap-2 text-sm mb-2">
                      {log.deviceCondition && (
                        <div>
                          <span className="text-muted">Tình trạng máy: </span>
                          <span>{log.deviceCondition}</span>
                        </div>
                      )}
                      {log.rootCause && (
                        <div>
                          <span className="text-muted">Nguyên nhân hư hỏng: </span>
                          <span>{log.rootCause}</span>
                        </div>
                      )}
                      {log.testResult && (
                        <div>
                          <span className="text-muted">Kết quả kiểm tra: </span>
                          <span className="text-success font-semibold">{log.testResult}</span>
                        </div>
                      )}
                      {log.notes && (
                        <div>
                          <span className="text-muted">Ghi chú: </span>
                          <span>{log.notes}</span>
                        </div>
                      )}
                    </div>

                    {(log.imagesBefore?.length > 0 || log.imagesAfter?.length > 0) && (
                      <div className="log-images-grid mt-2 pt-2 border-top d-flex gap-3 flex-wrap">
                        {log.imagesBefore?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-muted mb-1">📸 Ảnh trước sửa chữa ({log.imagesBefore.length}):</div>
                            <div className="d-flex gap-1 flex-wrap">
                              {log.imagesBefore.map((img, idx) => (
                                <a key={idx} href={img} target="_blank" rel="noreferrer">
                                  <img src={img} alt="Trước sửa chữa" className="img-thumbnail" style={{ width: 80, height: 80, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        {log.imagesAfter?.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-success mb-1">📸 Ảnh sau sửa chữa ({log.imagesAfter.length}):</div>
                            <div className="d-flex gap-1 flex-wrap">
                              {log.imagesAfter.map((img, idx) => (
                                <a key={idx} href={img} target="_blank" rel="noreferrer">
                                  <img src={img} alt="Sau sửa chữa" className="img-thumbnail" style={{ width: 80, height: 80, objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: PARTS REQUESTS */}
        {activeTab === 'partsRequests' && (
          <div className="card">
            <div className="section-header">
              <h3 className="card__title">Yêu cầu cấp phát linh kiện từ kho</h3>
              {canRepair && !isTerminal && (
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => setShowPartsReqModal(true)}
                >
                  + Yêu cầu cấp linh kiện
                </button>
              )}
            </div>

            {partsRequests.length === 0 ? (
              <EmptyState
                title="Chưa có yêu cầu cấp phát"
                message="Phiếu này chưa phát sinh yêu cầu xuất vật tư từ kho."
                action={
                  canRepair && !isTerminal && (
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setShowPartsReqModal(true)}
                    >
                      Tạo yêu cầu cấp phát
                    </button>
                  )
                }
              />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã yêu cầu</th>
                    <th>Trạng thái</th>
                    <th>Linh kiện yêu cầu</th>
                    <th>Lý do yêu cầu</th>
                    <th>Người gửi / Duyệt</th>
                    <th className="text-right">Thao tác kho</th>
                  </tr>
                </thead>
                <tbody>
                  {partsRequests.map((pr) => {
                    const st = getPartsRequestStatusInfo(pr.status);
                    return (
                      <tr key={pr.id}>
                        <td className="font-semibold text-primary">{pr.requestCode}</td>
                        <td>
                          <span className={`badge ${st.className}`}>{st.label}</span>
                        </td>
                        <td>
                          {(pr.items || []).map((it) => (
                            <div key={it.id} className="text-sm">
                              • <strong>{it.inventoryItemName}</strong>: {it.quantityRequested} {it.inventoryItemUnit || 'cái'}
                              {it.quantityApproved !== null && (
                                <span className="text-success ml-1">(Duyệt: {it.quantityApproved})</span>
                              )}
                            </div>
                          ))}
                        </td>
                        <td className="text-sm">{pr.reason || '—'}</td>
                        <td className="text-sm">
                          <div>Gửi: {pr.requestedByName}</div>
                          {pr.reviewedByName && <div className="text-muted">Duyệt: {pr.reviewedByName}</div>}
                          {pr.rejectionReason && <div className="text-danger">Từ chối: {pr.rejectionReason}</div>}
                        </td>
                        <td className="text-right">
                          <div className="button-group justify-end">
                            {canWarehouse && pr.status === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn--success btn--sm"
                                  onClick={() => handleApprovePartsRequest(pr.id)}
                                >
                                  ✓ Duyệt
                                </button>
                                <button
                                  type="button"
                                  className="btn btn--outline-danger btn--sm"
                                  onClick={() => handleRejectPartsRequest(pr.id)}
                                >
                                  ✕ Từ chối
                                </button>
                              </>
                            )}
                            {canWarehouse && pr.status === 'APPROVED' && (
                              <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => handleIssuePartsRequest(pr.id)}
                              >
                                📦 Xuất kho ngay
                              </button>
                            )}
                            {pr.status === 'ISSUED' && (
                              <span className="text-success text-sm font-semibold">✓ Đã xuất kho</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* MODAL: STATUS TRANSITION (TERMINAL / OVERRIDE REASON) */}
      {showStatusModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                Chuyển trạng thái sang: {getRepairStatusInfo(pendingStatus).label}
              </h3>
              <button type="button" className="modal__close" onClick={() => setShowStatusModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal__body">
              <div className="form-group">
                <label className="form-label" htmlFor="status-reason-input">
                  Lý do chuyển trạng thái *
                </label>
                <textarea
                  id="status-reason-input"
                  required
                  rows={3}
                  className="form-control"
                  placeholder="Ghi rõ lý do hủy hoặc không thể sửa chữa..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                />
              </div>
              {canManageOps && (
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={statusOverride}
                      onChange={(e) => setStatusOverride(e.target.checked)}
                    />{' '}
                    Sử dụng quyền Quản lý để cưỡng chế chuyển trạng thái (Override)
                  </label>
                </div>
              )}
            </div>
            <div className="modal__footer">
              <button type="button" className="btn btn--outline" onClick={() => setShowStatusModal(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={!statusReason.trim()}
                onClick={() => handleStatusChange(pendingStatus, statusReason, statusOverride)}
              >
                Xác nhận chuyển
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN TECHNICIAN */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Phân công kỹ thuật viên</h3>
              <button type="button" className="modal__close" onClick={() => setShowAssignModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="tech-select">
                    Chọn kỹ thuật viên *
                  </label>
                  <select
                    id="tech-select"
                    required
                    className="form-control"
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                  >
                    <option value="">-- Chọn kỹ thuật viên --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} ({t.username})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="asg-notes">
                    Ghi chú chỉ dẫn
                  </label>
                  <textarea
                    id="asg-notes"
                    rows={2}
                    className="form-control"
                    placeholder="Lưu ý về linh kiện hoặc thời gian..."
                    value={assignNotes}
                    onChange={(e) => setAssignNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowAssignModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Lưu phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DIAGNOSTIC FORM */}
      {showDiagModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Ghi nhận kết quả chẩn đoán</h3>
              <button type="button" className="modal__close" onClick={() => setShowDiagModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddDiagnostic}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="diag-text">
                    Nội dung kết luận chẩn đoán *
                  </label>
                  <textarea
                    id="diag-text"
                    required
                    rows={3}
                    className="form-control"
                    placeholder="Nguyên nhân hỏng hóc, linh kiện bị chập, cháy, lỗi mạch..."
                    value={diagForm.diagnosisText}
                    onChange={(e) => setDiagForm({ ...diagForm, diagnosisText: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="diag-action">
                    Đề xuất phương án xử lý
                  </label>
                  <textarea
                    id="diag-action"
                    rows={2}
                    className="form-control"
                    placeholder="Thay thế IC nguồn, đóng lại chân chip, vệ sinh mạch..."
                    value={diagForm.recommendedAction}
                    onChange={(e) => setDiagForm({ ...diagForm, recommendedAction: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="diag-labor">
                    Ước tính công thợ (VNĐ)
                  </label>
                  <input
                    id="diag-labor"
                    type="number"
                    min="0"
                    step="1000"
                    className="form-control"
                    placeholder="150000"
                    value={diagForm.estimatedLabor}
                    onChange={(e) => setDiagForm({ ...diagForm, estimatedLabor: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowDiagModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Lưu chẩn đoán
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE QUOTE FORM */}
      {showQuoteModal && (
        <div className="modal-backdrop">
          <div className="modal modal--large">
            <div className="modal__header">
              <h3 className="modal__title">Tạo bản báo giá mới</h3>
              <button type="button" className="modal__close" onClick={() => setShowQuoteModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateQuote}>
              <div className="modal__body">
                <div className="quote-items-builder">
                  <div className="quote-items-header">
                    <span>Hạng mục báo giá</span>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={handleAddQuoteItem}>
                      + Thêm dòng
                    </button>
                  </div>
                  {quoteItems.map((item, index) => (
                    <div key={index} className="quote-item-row">
                      <select
                        className="form-control quote-item-row__type"
                        value={item.itemType}
                        onChange={(e) => {
                          const updated = [...quoteItems];
                          updated[index].itemType = e.target.value;
                          setQuoteItems(updated);
                        }}
                      >
                        <option value="LABOR">Tiền công</option>
                        <option value="PART">Linh kiện</option>
                      </select>
                      <input
                        type="text"
                        required
                        className="form-control quote-item-row__desc"
                        placeholder="Mô tả công việc hoặc linh kiện..."
                        value={item.description}
                        onChange={(e) => {
                          const updated = [...quoteItems];
                          updated[index].description = e.target.value;
                          setQuoteItems(updated);
                        }}
                      />
                      <input
                        type="number"
                        min="1"
                        required
                        className="form-control quote-item-row__qty"
                        placeholder="SL"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...quoteItems];
                          updated[index].quantity = e.target.value;
                          setQuoteItems(updated);
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        required
                        className="form-control quote-item-row__price"
                        placeholder="Đơn giá"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const updated = [...quoteItems];
                          updated[index].unitPrice = e.target.value;
                          setQuoteItems(updated);
                        }}
                      />
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        className="form-control quote-item-row__discount"
                        placeholder="Giảm giá"
                        value={item.discount}
                        onChange={(e) => {
                          const updated = [...quoteItems];
                          updated[index].discount = e.target.value;
                          setQuoteItems(updated);
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn--outline-danger btn--sm"
                        disabled={quoteItems.length === 1}
                        onClick={() => handleRemoveQuoteItem(index)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="form-group mt-3">
                  <label className="form-label" htmlFor="quote-notes">
                    Ghi chú / Điều khoản kèm theo
                  </label>
                  <textarea
                    id="quote-notes"
                    rows={2}
                    className="form-control"
                    placeholder="Thời hạn báo giá, chế độ bảo hành cam kết..."
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowQuoteModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Tạo bản báo giá
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DECIDE QUOTE (APPROVE / REJECT) */}
      {showDecisionModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                {decisionType === 'APPROVED' ? 'Xác nhận khách đồng ý báo giá' : 'Khách từ chối báo giá'}
              </h3>
              <button type="button" className="modal__close" onClick={() => setShowDecisionModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleDecideQuote}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="decision-contact">
                    Tên người liên hệ xác nhận (khách hàng)
                  </label>
                  <input
                    id="decision-contact"
                    type="text"
                    className="form-control"
                    placeholder="Anh/Chị ..."
                    value={decisionContact}
                    onChange={(e) => setDecisionContact(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="decision-notes">
                    Ghi chú phản hồi của khách
                  </label>
                  <textarea
                    id="decision-notes"
                    rows={2}
                    className="form-control"
                    placeholder="Ghi chú thêm về thời gian bàn giao hoặc yêu cầu khác..."
                    value={decisionNote}
                    onChange={(e) => setDecisionNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowDecisionModal(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`btn ${decisionType === 'APPROVED' ? 'btn--success' : 'btn--danger'}`}
                >
                  {decisionType === 'APPROVED' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADMIN THẨM ĐỊNH BÁO GIÁ */}
      {showAdminDecisionModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">
                {adminDecisionType === 'APPROVED' ? '⚖️ Phê duyệt báo giá (Gửi khách hàng)' : '↩️ Yêu cầu KTV điều chỉnh báo giá'}
              </h3>
              <button type="button" className="modal__close" onClick={() => setShowAdminDecisionModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAdminDecideQuote}>
              <div className="modal__body">
                {adminDecisionType === 'APPROVED' ? (
                  <p className="text-sm text-muted">
                    Sau khi Quản trị viên duyệt, báo giá sẽ được chuyển sang trạng thái <strong>AWAITING_CUSTOMER_APPROVAL</strong> và hiển thị trên Cổng Khách Hàng để khách hàng xem xét và quyết định.
                  </p>
                ) : (
                  <p className="text-sm text-danger font-semibold">
                    Đơn hàng sẽ được chuyển về lại Kỹ thuật viên để điều chỉnh lại phương án hoặc chi phí. Bắt buộc nhập lý do bên dưới:
                  </p>
                )}
                <div className="form-group mt-3">
                  <label className="form-label" htmlFor="admin-decision-note">
                    {adminDecisionType === 'APPROVED' ? 'Ghi chú phê duyệt (tùy chọn)' : 'Lý do yêu cầu điều chỉnh *'}
                  </label>
                  <textarea
                    id="admin-decision-note"
                    rows={3}
                    required={adminDecisionType === 'REJECTED'}
                    className="form-control"
                    placeholder={
                      adminDecisionType === 'APPROVED'
                        ? 'Đã kiểm tra chi phí và vật tư hợp lý...'
                        : 'Ví dụ: Giá linh kiện quá cao, giảm tiền công thợ, đổi model linh kiện...'
                    }
                    value={adminDecisionNote}
                    onChange={(e) => setAdminDecisionNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowAdminDecisionModal(false)}>
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`btn ${adminDecisionType === 'APPROVED' ? 'btn--success' : 'btn--danger'}`}
                >
                  {adminDecisionType === 'APPROVED' ? '✅ Xác nhận phê duyệt' : '↩️ Gửi yêu cầu sửa lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PART */}
      {showPartModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Thêm linh kiện sử dụng</h3>
              <button type="button" className="modal__close" onClick={() => setShowPartModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddPart}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="part-desc">
                    Mô tả linh kiện / Tên phụ tùng *
                  </label>
                  <input
                    id="part-desc"
                    type="text"
                    required
                    className="form-control"
                    placeholder="Tụ điện 450V, Cáp nguồn, Màn hình OLED..."
                    value={partForm.description}
                    onChange={(e) => setPartForm({ ...partForm, description: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label" htmlFor="part-qty">
                      Số lượng *
                    </label>
                    <input
                      id="part-qty"
                      type="number"
                      min="1"
                      required
                      className="form-control"
                      value={partForm.quantity}
                      onChange={(e) => setPartForm({ ...partForm, quantity: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="part-price">
                      Giá bán tính cho khách (VNĐ) *
                    </label>
                    <input
                      id="part-price"
                      type="number"
                      min="0"
                      step="1000"
                      required
                      className="form-control"
                      value={partForm.unitPrice}
                      onChange={(e) => setPartForm({ ...partForm, unitPrice: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="part-cost">
                    Giá vốn nội bộ (VNĐ)
                  </label>
                  <input
                    id="part-cost"
                    type="number"
                    min="0"
                    step="1000"
                    className="form-control"
                    value={partForm.unitCostSnapshot}
                    onChange={(e) => setPartForm({ ...partForm, unitCostSnapshot: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowPartModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Thêm vào phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD PAYMENT */}
      {showPaymentModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Thu tiền phiếu sửa chữa</h3>
              <button type="button" className="modal__close" onClick={() => setShowPaymentModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePayment}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="pay-amt">
                    Số tiền thanh toán (VNĐ) *
                  </label>
                  <input
                    id="pay-amt"
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    className="form-control"
                    placeholder="Nhập số tiền..."
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pay-method">
                    Hình thức thanh toán *
                  </label>
                  <select
                    id="pay-method"
                    required
                    className="form-control"
                    value={paymentForm.paymentMethod}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                    <option value="CARD">Quẹt thẻ ngân hàng</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pay-notes">
                    Ghi chú
                  </label>
                  <input
                    id="pay-notes"
                    type="text"
                    className="form-control"
                    placeholder="Mã chuyển khoản, thông tin người nộp..."
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowPaymentModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Xác nhận thu tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE WARRANTY */}
      {showWarrantyModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Cấp thẻ bảo hành</h3>
              <button type="button" className="modal__close" onClick={() => setShowWarrantyModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateWarranty}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="warr-type">
                    Loại bảo hành *
                  </label>
                  <select
                    id="warr-type"
                    required
                    className="form-control"
                    value={warrantyForm.warrantyType}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, warrantyType: e.target.value })}
                  >
                    <option value="REPAIR">Bảo hành sửa chữa</option>
                    <option value="PARTS">Bảo hành linh kiện</option>
                    <option value="DEVICE">Bảo hành toàn máy</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="warr-days">
                    Thời hạn bảo hành (ngày) *
                  </label>
                  <input
                    id="warr-days"
                    type="number"
                    min="1"
                    max="1000"
                    required
                    className="form-control"
                    value={warrantyForm.durationDays}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, durationDays: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="warr-terms">
                    Điều khoản bảo hành
                  </label>
                  <textarea
                    id="warr-terms"
                    rows={3}
                    className="form-control"
                    value={warrantyForm.terms}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, terms: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowWarrantyModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Cấp thẻ bảo hành
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD REPAIR LOG */}
      {showLogModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Ghi nhật ký sửa chữa</h3>
              <button type="button" className="modal__close" onClick={() => setShowLogModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateLog}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="log-work">
                    Công việc đã thực hiện *
                  </label>
                  <textarea
                    id="log-work"
                    required
                    rows={3}
                    className="form-control"
                    placeholder="Ví dụ: Vệ sinh dàn lạnh, nạp gas R22 300g, thay tụ quạt 2.5uF..."
                    value={logForm.workPerformed}
                    onChange={(e) => setLogForm({ ...logForm, workPerformed: e.target.value })}
                  />
                </div>
                <div className="grid-2-cols gap-3">
                  <div className="form-group">
                    <label className="form-label" htmlFor="log-condition">
                      Tình trạng thiết bị ban đầu
                    </label>
                    <input
                      id="log-condition"
                      type="text"
                      className="form-control"
                      placeholder="Máy chạy nhưng không lạnh..."
                      value={logForm.deviceCondition}
                      onChange={(e) => setLogForm({ ...logForm, deviceCondition: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="log-cause">
                      Nguyên nhân hư hỏng
                    </label>
                    <input
                      id="log-cause"
                      type="text"
                      className="form-control"
                      placeholder="Xì giắc co đường ống, hỏng tụ..."
                      value={logForm.rootCause}
                      onChange={(e) => setLogForm({ ...logForm, rootCause: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="log-result">
                    Kết quả kiểm tra vận hành sau sửa
                  </label>
                  <input
                    id="log-result"
                    type="text"
                    className="form-control"
                    placeholder="Áp suất gas 65-70 psi, độ lạnh sâu 16°C ổn định..."
                    value={logForm.testResult}
                    onChange={(e) => setLogForm({ ...logForm, testResult: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="log-notes">
                    Ghi chú thêm
                  </label>
                  <textarea
                    id="log-notes"
                    rows={2}
                    className="form-control"
                    placeholder="Lưu ý khách sử dụng hoặc hướng dẫn vệ sinh định kỳ..."
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  />
                </div>
                <div className="grid-2-cols gap-3">
                  <div className="form-group">
                    <label className="form-label" htmlFor="log-img-before">
                      📷 Link ảnh trước sửa chữa (cách nhau dấu phẩy)
                    </label>
                    <input
                      id="log-img-before"
                      type="text"
                      className="form-control"
                      placeholder="https://.../anh-truoc-1.jpg, https://.../anh-truoc-2.jpg"
                      value={logForm.imagesBefore}
                      onChange={(e) => setLogForm({ ...logForm, imagesBefore: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="log-img-after">
                      📷 Link ảnh sau sửa chữa (cách nhau dấu phẩy)
                    </label>
                    <input
                      id="log-img-after"
                      type="text"
                      className="form-control"
                      placeholder="https://.../anh-sau-1.jpg, https://.../anh-sau-2.jpg"
                      value={logForm.imagesAfter}
                      onChange={(e) => setLogForm({ ...logForm, imagesAfter: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowLogModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Lưu nhật ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PARTS REQUEST */}
      {showPartsReqModal && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal__header">
              <h3 className="modal__title">Tạo yêu cầu cấp phát linh kiện từ kho</h3>
              <button type="button" className="modal__close" onClick={() => setShowPartsReqModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleCreatePartsRequest}>
              <div className="modal__body">
                <div className="form-group">
                  <label className="form-label" htmlFor="pr-item">
                    Chọn linh kiện từ kho *
                  </label>
                  <select
                    id="pr-item"
                    required
                    className="form-control"
                    value={partsReqForm.inventoryItemId}
                    onChange={(e) => setPartsReqForm({ ...partsReqForm, inventoryItemId: e.target.value })}
                  >
                    <option value="">-- Chọn linh kiện trong danh mục --</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.sku}) - {item.unit || 'cái'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pr-qty">
                    Số lượng cần cấp *
                  </label>
                  <input
                    id="pr-qty"
                    type="number"
                    min="1"
                    step="1"
                    required
                    className="form-control"
                    value={partsReqForm.quantityRequested}
                    onChange={(e) => setPartsReqForm({ ...partsReqForm, quantityRequested: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="pr-reason">
                    Lý do yêu cầu
                  </label>
                  <textarea
                    id="pr-reason"
                    rows={2}
                    className="form-control"
                    placeholder="Linh kiện cũ bị cháy, rò rỉ, cần thay thế mới..."
                    value={partsReqForm.reason}
                    onChange={(e) => setPartsReqForm({ ...partsReqForm, reason: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal__footer">
                <button type="button" className="btn btn--outline" onClick={() => setShowPartsReqModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn--primary">
                  Gửi yêu cầu tới kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
