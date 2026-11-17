export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return String(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export const REPAIR_STATUS_MAP = {
  // 10 giai đoạn mới
  PENDING: { label: 'Chờ tiếp nhận', className: 'badge--warning' },
  ACCEPTED: { label: 'Đã tiếp nhận', className: 'badge--info' },
  REJECTED: { label: 'Đã từ chối', className: 'badge--danger' },
  ASSIGNED: { label: 'Đã phân công', className: 'badge--info' },
  DIAGNOSING: { label: 'Đang chẩn đoán', className: 'badge--warning' },
  AWAITING_ADMIN_APPROVAL: { label: 'Chờ Admin duyệt giá', className: 'badge--purple' },
  AWAITING_CUSTOMER_APPROVAL: { label: 'Chờ khách duyệt giá', className: 'badge--warning' },
  APPROVED: { label: 'Đã duyệt báo giá', className: 'badge--info' },
  IN_PROGRESS: { label: 'Đang sửa chữa', className: 'badge--primary' },
  WAITING_PARTS: { label: 'Đang chờ linh kiện', className: 'badge--warning' },
  COMPLETED: { label: 'Hoàn thành sửa chữa', className: 'badge--success' },
  PAID: { label: 'Đã thanh toán', className: 'badge--success' },
  CANCELLED: { label: 'Đã hủy', className: 'badge--danger' },
  UNREPAIRABLE: { label: 'Không sửa được', className: 'badge--danger' },

  // Tương thích ngược
  PENDING_RECEPTION: { label: 'Chờ tiếp nhận', className: 'badge--warning' },
  RECEIVED: { label: 'Đã tiếp nhận', className: 'badge--info' },
  WAITING_APPROVAL: { label: 'Chờ duyệt báo giá', className: 'badge--warning' },
  REPAIRING: { label: 'Đang sửa chữa', className: 'badge--primary' },
  WAITING_PAYMENT: { label: 'Chờ thanh toán', className: 'badge--warning' },
  READY_FOR_PICKUP: { label: 'Sẵn sàng giao máy', className: 'badge--success' },
  DELIVERED: { label: 'Đã giao khách', className: 'badge--neutral' },
};

export function getRepairStatusInfo(status) {
  return REPAIR_STATUS_MAP[status] || { label: status, className: 'badge--neutral' };
}

export const PARTS_REQUEST_STATUS_MAP = {
  PENDING: { label: 'Chờ duyệt', className: 'badge--warning' },
  APPROVED: { label: 'Đã duyệt', className: 'badge--info' },
  REJECTED: { label: 'Từ chối', className: 'badge--danger' },
  ISSUED: { label: 'Đã xuất kho', className: 'badge--success' },
  CANCELLED: { label: 'Đã hủy', className: 'badge--neutral' },
};

export function getPartsRequestStatusInfo(status) {
  return PARTS_REQUEST_STATUS_MAP[status] || { label: status, className: 'badge--neutral' };
}

export const QUOTE_STATUS_MAP = {
  DRAFT: { label: 'Bản nháp', className: 'badge--neutral' },
  SENT: { label: 'Đã gửi khách', className: 'badge--warning' },
  PENDING_CUSTOMER: { label: 'Chờ khách duyệt', className: 'badge--warning' },
  APPROVED: { label: 'Khách đồng ý', className: 'badge--success' },
  REJECTED: { label: 'Khách từ chối', className: 'badge--danger' },
  SUPERSEDED: { label: 'Đã thay thế', className: 'badge--neutral' },
  EXPIRED: { label: 'Hết hạn', className: 'badge--neutral' },
};

export function getQuoteStatusInfo(status) {
  return QUOTE_STATUS_MAP[status] || { label: status, className: 'badge--neutral' };
}

export const PAYMENT_STATUS_MAP = {
  UNPAID: { label: 'Chưa thanh toán', className: 'badge--danger' },
  PARTIAL: { label: 'Thanh toán một phần', className: 'badge--warning' },
  PAID: { label: 'Đã thanh toán đủ', className: 'badge--success' },
  OVERPAID: { label: 'Thanh toán dư', className: 'badge--info' },
};

export function getPaymentStatusInfo(status) {
  return PAYMENT_STATUS_MAP[status] || { label: status, className: 'badge--neutral' };
}

