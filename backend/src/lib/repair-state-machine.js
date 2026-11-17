import { AppError } from './app-error.js';

export const repairStatuses = [
  // 10 giai đoạn chính
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'ASSIGNED',
  'DIAGNOSING',
  'AWAITING_ADMIN_APPROVAL',
  'AWAITING_CUSTOMER_APPROVAL',
  'APPROVED',
  'IN_PROGRESS',
  'WAITING_PARTS',
  'COMPLETED',
  'PAID',
  'CANCELLED',
  'UNREPAIRABLE',
  // Tương thích ngược
  'PENDING_RECEPTION',
  'RECEIVED',
  'WAITING_APPROVAL',
  'REPAIRING',
  'WAITING_PAYMENT',
  'READY_FOR_PICKUP',
  'DELIVERED',
];

const transitions = {
  // GĐ 1: Khách/Lễ tân tạo đơn -> Chờ lễ tân tiếp nhận
  PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  PENDING_RECEPTION: ['ACCEPTED', 'RECEIVED', 'REJECTED', 'CANCELLED'],

  // GĐ 2: Lễ tân tiếp nhận
  ACCEPTED: ['ASSIGNED', 'DIAGNOSING', 'CANCELLED'],
  RECEIVED: ['ASSIGNED', 'DIAGNOSING', 'CANCELLED'],
  REJECTED: [],

  // GĐ 3: Admin phân công KTV
  ASSIGNED: ['DIAGNOSING', 'AWAITING_ADMIN_APPROVAL', 'WAITING_APPROVAL', 'ACCEPTED', 'RECEIVED', 'CANCELLED'],

  // GĐ 4: KTV chẩn đoán & lập báo giá gửi Admin
  DIAGNOSING: ['AWAITING_ADMIN_APPROVAL', 'AWAITING_CUSTOMER_APPROVAL', 'WAITING_APPROVAL', 'APPROVED', 'UNREPAIRABLE', 'CANCELLED'],

  // GĐ 5: Admin duyệt báo giá gửi Khách (hoặc yêu cầu KTV sửa lại)
  AWAITING_ADMIN_APPROVAL: ['AWAITING_CUSTOMER_APPROVAL', 'ASSIGNED', 'DIAGNOSING', 'CANCELLED'],

  // GĐ 6: Khách hàng xác nhận báo giá (Portal / Hotline)
  AWAITING_CUSTOMER_APPROVAL: ['APPROVED', 'AWAITING_ADMIN_APPROVAL', 'ASSIGNED', 'CANCELLED', 'UNREPAIRABLE'],
  WAITING_APPROVAL: ['APPROVED', 'AWAITING_CUSTOMER_APPROVAL', 'DIAGNOSING', 'CANCELLED', 'UNREPAIRABLE'],

  // ĐÃ DUYỆT BÁO GIÁ -> Cho phép sửa chữa
  APPROVED: ['IN_PROGRESS', 'REPAIRING', 'CANCELLED'],

  // GĐ 7: KTV thực hiện sửa chữa
  IN_PROGRESS: ['WAITING_PARTS', 'AWAITING_ADMIN_APPROVAL', 'COMPLETED', 'WAITING_PAYMENT', 'READY_FOR_PICKUP', 'CANCELLED'],
  REPAIRING: ['READY_FOR_PICKUP', 'WAITING_PARTS', 'WAITING_PAYMENT', 'COMPLETED', 'UNREPAIRABLE'],

  // GĐ 8: Chờ xuất linh kiện từ kho
  WAITING_PARTS: ['IN_PROGRESS', 'REPAIRING', 'CANCELLED'],

  // GĐ 9: Hoàn thành sửa chữa -> Chờ kế toán thanh toán
  COMPLETED: ['PAID', 'DELIVERED', 'READY_FOR_PICKUP'],
  WAITING_PAYMENT: ['PAID', 'COMPLETED', 'DELIVERED', 'CANCELLED'],
  READY_FOR_PICKUP: ['PAID', 'DELIVERED', 'REPAIRING'],

  // GĐ 10: Kế toán thanh toán & Hóa đơn
  PAID: ['DELIVERED'],
  DELIVERED: [],

  CANCELLED: [],
  UNREPAIRABLE: [],
};

export function validateTransition(fromStatus, toStatus, { reason, override, roles = [] } = {}) {
  if (!repairStatuses.includes(toStatus)) throw new AppError(422, 'VALIDATION_ERROR', 'toStatus is invalid');
  const regular = transitions[fromStatus]?.includes(toStatus);
  const exceptionalRepairing = override === true && (toStatus === 'REPAIRING' || toStatus === 'IN_PROGRESS') && (roles.includes('ADMIN') || roles.includes('MANAGER'));
  if (!regular && !exceptionalRepairing) throw new AppError(409, 'INVALID_STATUS_TRANSITION', `Cannot transition from ${fromStatus} to ${toStatus}`);
  if ((toStatus === 'CANCELLED' || toStatus === 'UNREPAIRABLE' || toStatus === 'REJECTED' || exceptionalRepairing) && !reason) {
    throw new AppError(422, 'TRANSITION_REASON_REQUIRED', 'reason is required for this transition');
  }
  return { exceptionalRepairing };
}
