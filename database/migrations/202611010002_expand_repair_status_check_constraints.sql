-- Migration 202611010002: Expand repair status check constraints to support complete workflow statuses
-- Added statuses: ASSIGNED, IN_PROGRESS, WAITING_PAYMENT, COMPLETED

ALTER TABLE repair_orders DROP CHECK chk_repair_status;

ALTER TABLE repair_orders ADD CONSTRAINT chk_repair_status CHECK (
  repair_status IN (
    'PENDING_RECEPTION',
    'RECEIVED',
    'ASSIGNED',
    'DIAGNOSING',
    'WAITING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'REPAIRING',
    'WAITING_PARTS',
    'WAITING_PAYMENT',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED',
    'UNREPAIRABLE'
  )
);

ALTER TABLE repair_status_history DROP CHECK chk_history_status;

ALTER TABLE repair_status_history ADD CONSTRAINT chk_history_status CHECK (
  to_status IN (
    'PENDING_RECEPTION',
    'RECEIVED',
    'ASSIGNED',
    'DIAGNOSING',
    'WAITING_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'REPAIRING',
    'WAITING_PARTS',
    'WAITING_PAYMENT',
    'READY_FOR_PICKUP',
    'COMPLETED',
    'DELIVERED',
    'CANCELLED',
    'UNREPAIRABLE'
  )
);

