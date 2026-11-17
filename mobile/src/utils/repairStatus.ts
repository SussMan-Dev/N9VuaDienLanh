/** Nhãn hiển thị và màu sắc cho 10 trạng thái phiếu sửa chữa */
export type RepairStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'ASSIGNED'
  | 'DIAGNOSING'
  | 'AWAITING_ADMIN_APPROVAL'
  | 'AWAITING_CUSTOMER_APPROVAL'
  | 'APPROVED'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'COMPLETED'
  | 'PAID'
  | 'DELIVERED'
  | 'CANCELLED';

interface StatusInfo {
  label: string;
  color: string;       // text color
  bgColor: string;     // badge background
  step?: number;       // giai đoạn (1-10)
}

const STATUS_MAP: Record<string, StatusInfo> = {
  PENDING:                     { label: 'Chờ tiếp nhận',         color: '#92400e', bgColor: '#fef3c7', step: 1 },
  ACCEPTED:                    { label: 'Đã tiếp nhận',          color: '#1e40af', bgColor: '#dbeafe', step: 2 },
  REJECTED:                    { label: 'Từ chối',               color: '#991b1b', bgColor: '#fee2e2' },
  ASSIGNED:                    { label: 'Đã phân công KTV',      color: '#1e40af', bgColor: '#dbeafe', step: 3 },
  DIAGNOSING:                  { label: 'Đang xử lý báo giá',   color: '#3730a3', bgColor: '#e0e7ff', step: 2 },
  AWAITING_ADMIN_APPROVAL:     { label: 'Chờ Admin duyệt giá',   color: '#92400e', bgColor: '#fffbeb', step: 5 },
  AWAITING_CUSTOMER_APPROVAL:  { label: 'Chờ khách duyệt giá',  color: '#ea580c', bgColor: '#fff7ed', step: 6 },
  APPROVED:                    { label: 'Báo giá đã duyệt',      color: '#065f46', bgColor: '#d1fae5', step: 6 },
  IN_PROGRESS:                 { label: 'Đang sửa chữa',         color: '#1d4ed8', bgColor: '#eff6ff', step: 7 },
  WAITING_PARTS:               { label: 'Chờ linh kiện',         color: '#92400e', bgColor: '#fef3c7', step: 8 },
  COMPLETED:                   { label: 'Hoàn tất sửa chữa',     color: '#065f46', bgColor: '#d1fae5', step: 9 },
  PAID:                        { label: 'Đã thanh toán',         color: '#065f46', bgColor: '#bbf7d0', step: 10 },
  DELIVERED:                   { label: 'Đã bàn giao',           color: '#374151', bgColor: '#f3f4f6', step: 10 },
  CANCELLED:                   { label: 'Đã huỷ',               color: '#6b7280', bgColor: '#f3f4f6' },
};

export function getStatusInfo(status: string): StatusInfo {
  return STATUS_MAP[status] ?? { label: status, color: '#374151', bgColor: '#f3f4f6' };
}

export const STATUS_ORDER: RepairStatus[] = [
  'PENDING', 'ACCEPTED', 'ASSIGNED', 'DIAGNOSING',
  'AWAITING_ADMIN_APPROVAL', 'AWAITING_CUSTOMER_APPROVAL',
  'IN_PROGRESS', 'WAITING_PARTS', 'COMPLETED', 'PAID', 'DELIVERED',
];
