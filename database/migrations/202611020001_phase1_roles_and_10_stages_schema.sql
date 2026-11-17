-- Migration 202611020001: Phase 1 - 6 Roles & 10 Stages Schema Upgrade
-- 1. Insert Role ACCOUNTANT and WAREHOUSE_STAFF
-- 2. Insert permission billing.manage
-- 3. Expand status check constraints for repair_orders and repair_status_history
-- 4. Add rejection_reason and paid_at to repair_orders
-- 5. Add admin approval columns to quotes

SET NAMES utf8mb4;

-- 1. Add new permissions if not exists
INSERT INTO permissions (code, description)
VALUES 
  ('billing.manage', 'Quản lý hóa đơn, thanh toán và công nợ')
ON DUPLICATE KEY UPDATE description=VALUES(description);

-- 2. Add ACCOUNTANT and WAREHOUSE_STAFF roles
INSERT INTO roles (code, name, description)
VALUES 
  ('ACCOUNTANT', 'Kế toán', 'Quản lý hóa đơn, xác nhận chi phí và thu tiền thanh toán'),
  ('WAREHOUSE_STAFF', 'Thủ kho', 'Quản lý danh sách linh kiện, kiểm tra tồn kho và xuất kho')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

-- Assign permissions to ACCOUNTANT: billing.manage, reports.view, intake.manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'ACCOUNTANT'
  AND p.code IN ('billing.manage', 'reports.view', 'intake.manage')
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Assign permissions to WAREHOUSE_STAFF: inventory.manage, warehouse.manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'WAREHOUSE_STAFF'
  AND p.code IN ('inventory.manage', 'warehouse.manage')
ON DUPLICATE KEY UPDATE role_id=role_id;

-- Assign billing.manage to ADMIN and MANAGER
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code IN ('ADMIN', 'MANAGER')
  AND p.code = 'billing.manage'
ON DUPLICATE KEY UPDATE role_id=role_id;

-- 3. Add columns to repair_orders if not exists
SET @exist_col = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repair_orders' AND COLUMN_NAME = 'rejection_reason'
);
SET @sql = IF(@exist_col = 0, 'ALTER TABLE repair_orders ADD COLUMN rejection_reason VARCHAR(500) NULL AFTER notes', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_col2 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'repair_orders' AND COLUMN_NAME = 'paid_at'
);
SET @sql2 = IF(@exist_col2 = 0, 'ALTER TABLE repair_orders ADD COLUMN paid_at DATETIME NULL AFTER delivered_at', 'SELECT 1');
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 4. Add admin approval columns to quotes
SET @exist_col3 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'admin_approval_status'
);
SET @sql3 = IF(@exist_col3 = 0, 'ALTER TABLE quotes ADD COLUMN admin_approval_status VARCHAR(30) NOT NULL DEFAULT "PENDING" AFTER status', 'SELECT 1');
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

SET @exist_col4 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'admin_approved_by_user_id'
);
SET @sql4 = IF(@exist_col4 = 0, 'ALTER TABLE quotes ADD COLUMN admin_approved_by_user_id BIGINT UNSIGNED NULL AFTER admin_approval_status, ADD CONSTRAINT fk_quotes_admin_approved_by FOREIGN KEY (admin_approved_by_user_id) REFERENCES users(id)', 'SELECT 1');
PREPARE stmt4 FROM @sql4;
EXECUTE stmt4;
DEALLOCATE PREPARE stmt4;

SET @exist_col5 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'admin_approved_at'
);
SET @sql5 = IF(@exist_col5 = 0, 'ALTER TABLE quotes ADD COLUMN admin_approved_at DATETIME NULL AFTER admin_approved_by_user_id', 'SELECT 1');
PREPARE stmt5 FROM @sql5;
EXECUTE stmt5;
DEALLOCATE PREPARE stmt5;

SET @exist_col6 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'admin_reject_note'
);
SET @sql6 = IF(@exist_col6 = 0, 'ALTER TABLE quotes ADD COLUMN admin_reject_note VARCHAR(500) NULL AFTER admin_approved_at', 'SELECT 1');
PREPARE stmt6 FROM @sql6;
EXECUTE stmt6;
DEALLOCATE PREPARE stmt6;

SET @exist_col7 = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'quotes' AND COLUMN_NAME = 'is_supplemental'
);
SET @sql7 = IF(@exist_col7 = 0, 'ALTER TABLE quotes ADD COLUMN is_supplemental BOOLEAN NOT NULL DEFAULT FALSE AFTER admin_reject_note', 'SELECT 1');
PREPARE stmt7 FROM @sql7;
EXECUTE stmt7;
DEALLOCATE PREPARE stmt7;

-- 5. Expand status check constraints on repair_orders and repair_status_history
ALTER TABLE repair_orders DROP CHECK chk_repair_status;

ALTER TABLE repair_orders ADD CONSTRAINT chk_repair_status CHECK (
  repair_status IN (
    -- 10 quy trình chính
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
    -- Các trạng thái tương thích ngược
    'PENDING_RECEPTION',
    'RECEIVED',
    'WAITING_APPROVAL',
    'REPAIRING',
    'WAITING_PAYMENT',
    'READY_FOR_PICKUP',
    'DELIVERED'
  )
);

ALTER TABLE repair_status_history DROP CHECK chk_history_status;

ALTER TABLE repair_status_history ADD CONSTRAINT chk_history_status CHECK (
  to_status IN (
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
    -- Tương thích ngược
    'PENDING_RECEPTION',
    'RECEIVED',
    'WAITING_APPROVAL',
    'REPAIRING',
    'WAITING_PAYMENT',
    'READY_FOR_PICKUP',
    'DELIVERED'
  )
);

