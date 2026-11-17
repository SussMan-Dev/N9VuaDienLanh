-- ============================================================
-- Migration: 202611010001_full_schema_v2.sql
-- Description: Full schema replacement v2 – supersedes all
--              previous migrations (202610270001-03).
--              Adds new tables, extends existing ones, and
--              re-seeds all reference data.
-- Target: MySQL 8.0.16+
-- WARNING: Drops and recreates ALL tables. Data will be lost.
-- ============================================================
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- DROP ALL TABLES (reverse FK order)
-- ============================================================
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS warranties;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS repair_labor_items;
DROP TABLE IF EXISTS repair_order_parts;
DROP TABLE IF EXISTS parts_request_items;
DROP TABLE IF EXISTS parts_requests;
DROP TABLE IF EXISTS repair_logs;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS inventory_stocks;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS quote_decision_history;
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS diagnostics;
DROP TABLE IF EXISTS repair_status_history;
DROP TABLE IF EXISTS repair_assignments;
DROP TABLE IF EXISTS repair_orders;
DROP TABLE IF EXISTS service_requests;
DROP TABLE IF EXISTS devices;
DROP TABLE IF EXISTS device_types;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS auth_sessions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS warehouses;
DROP TABLE IF EXISTS branches;

-- ============================================================
-- CORE REFERENCE TABLES
-- ============================================================

CREATE TABLE branches (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(32)  NOT NULL,
  name       VARCHAR(160) NOT NULL,
  phone      VARCHAR(32),
  email      VARCHAR(254),
  address_line VARCHAR(255),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_branches_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE warehouses (
  id        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id BIGINT UNSIGNED NOT NULL,
  code      VARCHAR(32)  NOT NULL,
  name      VARCHAR(160) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_warehouses_code (code),
  KEY idx_warehouses_branch (branch_id),
  CONSTRAINT fk_warehouses_branch FOREIGN KEY (branch_id) REFERENCES branches(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE roles (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role       FOREIGN KEY (role_id)       REFERENCES roles(id),
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- CUSTOMERS (before users so users can reference customers)
-- ============================================================

CREATE TABLE customers (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(32)  NOT NULL,
  full_name    VARCHAR(160) NOT NULL,
  phone        VARCHAR(32)  NOT NULL,
  email        VARCHAR(254),
  address_line VARCHAR(255),
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_customers_code (code),
  KEY idx_customers_phone (phone),
  KEY idx_customers_name  (full_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id     BIGINT UNSIGNED,
  customer_id   BIGINT UNSIGNED NULL,           -- Link to customer profile if CUSTOMER role
  username      VARCHAR(80)  NOT NULL,
  email         VARCHAR(254),
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(160) NOT NULL,
  phone         VARCHAR(32),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at DATETIME,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email   (email),
  KEY idx_users_branch   (branch_id),
  KEY idx_users_customer (customer_id),
  CONSTRAINT fk_users_branch   FOREIGN KEY (branch_id)   REFERENCES branches(id),
  CONSTRAINT fk_users_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_roles (
  user_id    BIGINT UNSIGNED NOT NULL,
  role_id    BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE auth_sessions (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  token_hash   CHAR(64)  NOT NULL,
  expires_at   DATETIME  NOT NULL,
  revoked_at   DATETIME  NULL,
  last_seen_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at   DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user_active (user_id, revoked_at, expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DEVICES
-- ============================================================

CREATE TABLE device_types (
  id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code       VARCHAR(50)  NOT NULL,
  name       VARCHAR(120) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_device_types_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE devices (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id    BIGINT UNSIGNED NOT NULL,
  device_type_id BIGINT UNSIGNED,
  brand          VARCHAR(100),
  model          VARCHAR(120),
  serial_number  VARCHAR(120),
  description    VARCHAR(500),
  purchase_date  DATE,
  is_active      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_devices_customer        (customer_id),
  KEY idx_devices_serial          (serial_number),
  KEY idx_devices_customer_active (customer_id, is_active),
  CONSTRAINT fk_devices_customer FOREIGN KEY (customer_id)    REFERENCES customers(id),
  CONSTRAINT fk_devices_type     FOREIGN KEY (device_type_id) REFERENCES device_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- SERVICE REQUESTS (extended: images, contact_phone, preferred_datetime)
-- ============================================================

CREATE TABLE service_requests (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id           BIGINT UNSIGNED NOT NULL,
  customer_id         BIGINT UNSIGNED NOT NULL,
  device_id           BIGINT UNSIGNED NOT NULL,
  requested_by_user_id BIGINT UNSIGNED NOT NULL,
  request_code        VARCHAR(32)  NOT NULL,
  issue_description   TEXT         NOT NULL,
  images              JSON         NULL,       -- Array of image URLs
  contact_phone       VARCHAR(32)  NULL,       -- Contact phone (may differ from account phone)
  preferred_datetime  DATETIME     NULL,       -- Customer's preferred service time
  requested_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status              VARCHAR(30)  NOT NULL DEFAULT 'OPEN',
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_service_requests_code          (request_code),
  KEY idx_service_requests_branch_status (branch_id, status),
  CONSTRAINT chk_service_requests_status CHECK (status IN ('OPEN','CONVERTED','CANCELLED')),
  CONSTRAINT fk_requests_branch   FOREIGN KEY (branch_id)            REFERENCES branches(id),
  CONSTRAINT fk_requests_customer FOREIGN KEY (customer_id)          REFERENCES customers(id),
  CONSTRAINT fk_requests_device   FOREIGN KEY (device_id)            REFERENCES devices(id),
  CONSTRAINT fk_requests_creator  FOREIGN KEY (requested_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REPAIR ORDERS (extended: PENDING_RECEPTION + WAITING_PARTS in ENUM,
--                technician_cost_estimate)
-- ============================================================

CREATE TABLE repair_orders (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  branch_id               BIGINT UNSIGNED NOT NULL,
  customer_id             BIGINT UNSIGNED NOT NULL,
  device_id               BIGINT UNSIGNED NOT NULL,
  service_request_id      BIGINT UNSIGNED,
  original_repair_order_id BIGINT UNSIGNED,
  received_by_user_id     BIGINT UNSIGNED NOT NULL,
  code                    VARCHAR(32)  NOT NULL,
  repair_status           VARCHAR(30)  NOT NULL DEFAULT 'RECEIVED',
  intake_condition        TEXT,
  reported_issue          TEXT         NOT NULL,
  received_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  promised_at             DATETIME,
  completed_at            DATETIME,
  delivered_at            DATETIME,
  labor_total             DECIMAL(14,2) NOT NULL DEFAULT 0,
  parts_total             DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_total          DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_total               DECIMAL(14,2) NOT NULL DEFAULT 0,
  technician_cost_estimate DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes                   TEXT,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_repair_orders_code    (code),
  UNIQUE KEY uq_repair_orders_request (service_request_id),
  KEY idx_repair_orders_branch_status (branch_id, repair_status),
  KEY idx_repair_orders_customer      (customer_id),
  KEY idx_repair_orders_device        (device_id),
  CONSTRAINT chk_repair_status CHECK (repair_status IN (
    'PENDING_RECEPTION','RECEIVED','DIAGNOSING','WAITING_APPROVAL',
    'APPROVED','REPAIRING','WAITING_PARTS',
    'READY_FOR_PICKUP','DELIVERED','CANCELLED','UNREPAIRABLE'
  )),
  CONSTRAINT chk_repair_amounts CHECK (
    labor_total >= 0 AND parts_total >= 0 AND discount_total >= 0 AND tax_total >= 0
    AND technician_cost_estimate >= 0
  ),
  CONSTRAINT fk_orders_branch    FOREIGN KEY (branch_id)               REFERENCES branches(id),
  CONSTRAINT fk_orders_customer  FOREIGN KEY (customer_id)             REFERENCES customers(id),
  CONSTRAINT fk_orders_device    FOREIGN KEY (device_id)               REFERENCES devices(id),
  CONSTRAINT fk_orders_request   FOREIGN KEY (service_request_id)      REFERENCES service_requests(id),
  CONSTRAINT fk_orders_original  FOREIGN KEY (original_repair_order_id) REFERENCES repair_orders(id),
  CONSTRAINT fk_orders_receiver  FOREIGN KEY (received_by_user_id)     REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE repair_assignments (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id    BIGINT UNSIGNED NOT NULL,
  technician_user_id BIGINT UNSIGNED NOT NULL,
  assigned_by_user_id BIGINT UNSIGNED NOT NULL,
  assigned_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unassigned_at      DATETIME,
  notes              VARCHAR(500),
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_assignment_order_active       (repair_order_id,      unassigned_at),
  KEY idx_assignment_technician_active  (technician_user_id,   unassigned_at),
  CONSTRAINT fk_assign_order      FOREIGN KEY (repair_order_id)     REFERENCES repair_orders(id),
  CONSTRAINT fk_assign_technician FOREIGN KEY (technician_user_id)  REFERENCES users(id),
  CONSTRAINT fk_assign_actor      FOREIGN KEY (assigned_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE repair_status_history (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id   BIGINT UNSIGNED NOT NULL,
  from_status       VARCHAR(30),
  to_status         VARCHAR(30) NOT NULL,
  changed_by_user_id BIGINT UNSIGNED NOT NULL,
  reason            VARCHAR(500),
  changed_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_status_history_order_time (repair_order_id, changed_at),
  CONSTRAINT chk_history_status CHECK (to_status IN (
    'PENDING_RECEPTION','RECEIVED','DIAGNOSING','WAITING_APPROVAL',
    'APPROVED','REPAIRING','WAITING_PARTS',
    'READY_FOR_PICKUP','DELIVERED','CANCELLED','UNREPAIRABLE'
  )),
  CONSTRAINT fk_history_order FOREIGN KEY (repair_order_id)    REFERENCES repair_orders(id),
  CONSTRAINT fk_history_actor FOREIGN KEY (changed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DIAGNOSTICS & QUOTES
-- ============================================================

CREATE TABLE diagnostics (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id    BIGINT UNSIGNED NOT NULL,
  technician_user_id BIGINT UNSIGNED NOT NULL,
  diagnosis_text     TEXT NOT NULL,
  recommended_action TEXT,
  estimated_labor    DECIMAL(14,2) NOT NULL DEFAULT 0,
  diagnosed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_diagnostics_order_time (repair_order_id, diagnosed_at),
  CONSTRAINT chk_diagnostic_labor CHECK (estimated_labor >= 0),
  CONSTRAINT fk_diagnostic_order      FOREIGN KEY (repair_order_id)    REFERENCES repair_orders(id),
  CONSTRAINT fk_diagnostic_technician FOREIGN KEY (technician_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE quotes (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id    BIGINT UNSIGNED NOT NULL,
  diagnostic_id      BIGINT UNSIGNED,
  version_no         INT UNSIGNED NOT NULL,
  status             VARCHAR(30)   NOT NULL DEFAULT 'DRAFT',
  labor_amount       DECIMAL(14,2) NOT NULL DEFAULT 0,
  parts_amount       DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_amount    DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_amount         DECIMAL(14,2) NOT NULL DEFAULT 0,
  valid_until        DATETIME,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_quotes_order_version  (repair_order_id, version_no),
  KEY idx_quotes_order_status         (repair_order_id, status),
  CONSTRAINT chk_quote_status  CHECK (status IN ('DRAFT','PENDING_CUSTOMER','APPROVED','REJECTED','EXPIRED','SUPERSEDED')),
  CONSTRAINT chk_quote_amounts CHECK (labor_amount >= 0 AND parts_amount >= 0 AND discount_amount >= 0 AND tax_amount >= 0),
  CONSTRAINT fk_quotes_order      FOREIGN KEY (repair_order_id)    REFERENCES repair_orders(id),
  CONSTRAINT fk_quotes_diagnostic FOREIGN KEY (diagnostic_id)      REFERENCES diagnostics(id),
  CONSTRAINT fk_quotes_creator    FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE quote_items (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_id    BIGINT UNSIGNED NOT NULL,
  item_type   VARCHAR(20)   NOT NULL,
  description VARCHAR(500)  NOT NULL,
  quantity    DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_price  DECIMAL(14,2) NOT NULL,
  line_total  DECIMAL(14,2) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_quote_items_quote (quote_id),
  CONSTRAINT chk_quote_item_type   CHECK (item_type IN ('LABOR','PART')),
  CONSTRAINT chk_quote_item_amount CHECK (quantity > 0 AND unit_price >= 0 AND line_total >= 0),
  CONSTRAINT fk_quote_items_quote  FOREIGN KEY (quote_id) REFERENCES quotes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE quote_decision_history (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quote_id             BIGINT UNSIGNED NOT NULL,
  decision             VARCHAR(20) NOT NULL,
  decided_by_user_id   BIGINT UNSIGNED,
  decided_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  customer_contact_name VARCHAR(160),
  note                 VARCHAR(500),
  KEY idx_quote_decision_time (quote_id, decided_at),
  CONSTRAINT chk_quote_decision CHECK (decision IN ('SENT','APPROVED','REJECTED','EXPIRED')),
  CONSTRAINT fk_quote_decision_quote FOREIGN KEY (quote_id)           REFERENCES quotes(id),
  CONSTRAINT fk_quote_decision_actor FOREIGN KEY (decided_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- INVENTORY
-- ============================================================

CREATE TABLE inventory_items (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku                VARCHAR(64)   NOT NULL,
  name               VARCHAR(200)  NOT NULL,
  unit               VARCHAR(20)   NOT NULL DEFAULT 'piece',
  standard_cost      DECIMAL(14,2) NOT NULL DEFAULT 0,
  default_sale_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  reorder_level      DECIMAL(12,3) NOT NULL DEFAULT 0,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventory_sku  (sku),
  KEY idx_inventory_name       (name),
  CONSTRAINT chk_inventory_item_amounts CHECK (standard_cost >= 0 AND default_sale_price >= 0 AND reorder_level >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory_stocks (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warehouse_id      BIGINT UNSIGNED NOT NULL,
  inventory_item_id BIGINT UNSIGNED NOT NULL,
  quantity_on_hand  DECIMAL(12,3) NOT NULL DEFAULT 0,
  quantity_reserved DECIMAL(12,3) NOT NULL DEFAULT 0,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_stock_warehouse_item (warehouse_id, inventory_item_id),
  CONSTRAINT chk_stock_amounts CHECK (quantity_on_hand >= 0 AND quantity_reserved >= 0 AND quantity_reserved <= quantity_on_hand),
  CONSTRAINT fk_stock_warehouse FOREIGN KEY (warehouse_id)      REFERENCES warehouses(id),
  CONSTRAINT fk_stock_item      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE inventory_transactions (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  warehouse_id        BIGINT UNSIGNED NOT NULL,
  inventory_item_id   BIGINT UNSIGNED NOT NULL,
  repair_order_id     BIGINT UNSIGNED,
  transaction_type    VARCHAR(20) NOT NULL,
  quantity            DECIMAL(12,3) NOT NULL,
  unit_cost           DECIMAL(14,2) NOT NULL DEFAULT 0,
  occurred_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  performed_by_user_id BIGINT UNSIGNED NOT NULL,
  note                VARCHAR(500),
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_inventory_tx_stock_time (warehouse_id, inventory_item_id, occurred_at),
  KEY idx_inventory_tx_order      (repair_order_id),
  CONSTRAINT chk_inventory_tx_type   CHECK (transaction_type IN ('RECEIPT','ISSUE','ADJUSTMENT_IN','ADJUSTMENT_OUT','RETURN')),
  CONSTRAINT chk_inventory_tx_amount CHECK (quantity > 0 AND unit_cost >= 0),
  CONSTRAINT fk_inventory_tx_warehouse FOREIGN KEY (warehouse_id)         REFERENCES warehouses(id),
  CONSTRAINT fk_inventory_tx_item      FOREIGN KEY (inventory_item_id)    REFERENCES inventory_items(id),
  CONSTRAINT fk_inventory_tx_order     FOREIGN KEY (repair_order_id)      REFERENCES repair_orders(id),
  CONSTRAINT fk_inventory_tx_actor     FOREIGN KEY (performed_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- REPAIR ITEMS (parts & labor)
-- ============================================================

CREATE TABLE repair_order_parts (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id         BIGINT UNSIGNED NOT NULL,
  inventory_item_id       BIGINT UNSIGNED,
  inventory_transaction_id BIGINT UNSIGNED,
  description             VARCHAR(500) NOT NULL,
  quantity                DECIMAL(12,3) NOT NULL,
  unit_cost_snapshot      DECIMAL(14,2) NOT NULL DEFAULT 0,
  unit_price_snapshot     DECIMAL(14,2) NOT NULL DEFAULT 0,
  line_total              DECIMAL(14,2) NOT NULL DEFAULT 0,
  created_by_user_id      BIGINT UNSIGNED NOT NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order_parts_order (repair_order_id),
  CONSTRAINT chk_order_part_amounts CHECK (quantity > 0 AND unit_cost_snapshot >= 0 AND unit_price_snapshot >= 0 AND line_total >= 0),
  CONSTRAINT fk_order_parts_order  FOREIGN KEY (repair_order_id)          REFERENCES repair_orders(id),
  CONSTRAINT fk_order_parts_item   FOREIGN KEY (inventory_item_id)        REFERENCES inventory_items(id),
  CONSTRAINT fk_order_parts_tx     FOREIGN KEY (inventory_transaction_id) REFERENCES inventory_transactions(id),
  CONSTRAINT fk_order_parts_actor  FOREIGN KEY (created_by_user_id)       REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE repair_labor_items (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id     BIGINT UNSIGNED NOT NULL,
  description         VARCHAR(500) NOT NULL,
  quantity            DECIMAL(12,3) NOT NULL DEFAULT 1,
  unit_price_snapshot DECIMAL(14,2) NOT NULL,
  line_total          DECIMAL(14,2) NOT NULL,
  created_by_user_id  BIGINT UNSIGNED NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_labor_order (repair_order_id),
  CONSTRAINT chk_labor_amounts CHECK (quantity > 0 AND unit_price_snapshot >= 0 AND line_total >= 0),
  CONSTRAINT fk_labor_order FOREIGN KEY (repair_order_id)    REFERENCES repair_orders(id),
  CONSTRAINT fk_labor_actor FOREIGN KEY (created_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- PAYMENTS & WARRANTIES
-- ============================================================

CREATE TABLE payments (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id    BIGINT UNSIGNED NOT NULL,
  received_by_user_id BIGINT UNSIGNED NOT NULL,
  receipt_number     VARCHAR(64) NOT NULL,
  payment_method     VARCHAR(20) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'VALID',
  amount             DECIMAL(14,2) NOT NULL,
  paid_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reference_code     VARCHAR(120),
  note               VARCHAR(500),
  voided_at          DATETIME,
  voided_by_user_id  BIGINT UNSIGNED,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_payments_receipt (receipt_number),
  KEY idx_payments_order_status (repair_order_id, status),
  CONSTRAINT chk_payment_method CHECK (payment_method IN ('CASH','BANK_TRANSFER','CARD','OTHER')),
  CONSTRAINT chk_payment_status CHECK (status IN ('VALID','VOIDED','REFUNDED')),
  CONSTRAINT chk_payment_amount CHECK (amount > 0),
  CONSTRAINT fk_payment_order   FOREIGN KEY (repair_order_id)     REFERENCES repair_orders(id),
  CONSTRAINT fk_payment_receiver FOREIGN KEY (received_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_payment_voider  FOREIGN KEY (voided_by_user_id)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE warranties (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id BIGINT UNSIGNED NOT NULL,
  warranty_code  VARCHAR(64) NOT NULL,
  starts_at      DATETIME NOT NULL,
  ends_at        DATETIME NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  terms          TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_warranty_code (warranty_code),
  KEY idx_warranty_order  (repair_order_id),
  KEY idx_warranty_expiry (status, ends_at),
  CONSTRAINT chk_warranty_status CHECK (status IN ('ACTIVE','EXPIRED','VOIDED','CLAIMED')),
  CONSTRAINT chk_warranty_dates  CHECK (ends_at >= starts_at),
  CONSTRAINT fk_warranty_order   FOREIGN KEY (repair_order_id) REFERENCES repair_orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- NEW TABLE: repair_logs
-- ============================================================

CREATE TABLE repair_logs (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id    BIGINT UNSIGNED NOT NULL,
  technician_user_id BIGINT UNSIGNED NOT NULL,
  performed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  device_condition   TEXT,           -- Tình trạng thiết bị lúc kiểm tra
  root_cause         TEXT,           -- Nguyên nhân hư hỏng
  work_performed     TEXT NOT NULL,  -- Công việc đã thực hiện
  test_result        TEXT,           -- Kết quả kiểm tra sau sửa
  images_before      JSON,           -- Mảng URL ảnh trước sửa
  images_after       JSON,           -- Mảng URL ảnh sau sửa
  notes              TEXT,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_repair_logs_order_time (repair_order_id, performed_at),
  CONSTRAINT fk_repair_logs_order FOREIGN KEY (repair_order_id)    REFERENCES repair_orders(id),
  CONSTRAINT fk_repair_logs_tech  FOREIGN KEY (technician_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- NEW TABLE: parts_requests
-- ============================================================

CREATE TABLE parts_requests (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id       BIGINT UNSIGNED NOT NULL,
  requested_by_user_id  BIGINT UNSIGNED NOT NULL,  -- KTV
  request_code          VARCHAR(32) NOT NULL,       -- PR-YYYYMMDD-XXXX
  status                VARCHAR(30) NOT NULL DEFAULT 'PENDING',
  reason                TEXT,
  notes                 TEXT,
  reviewed_by_user_id   BIGINT UNSIGNED NULL,       -- Warehouse manager
  reviewed_at           DATETIME NULL,
  rejection_reason      TEXT NULL,
  issued_at             DATETIME NULL,              -- Khi xuất kho thành công
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_parts_requests_code (request_code),
  KEY idx_parts_requests_order  (repair_order_id),
  KEY idx_parts_requests_status (status),
  CONSTRAINT chk_parts_request_status CHECK (status IN ('PENDING','APPROVED','REJECTED','ISSUED','CANCELLED')),
  CONSTRAINT fk_parts_req_order     FOREIGN KEY (repair_order_id)      REFERENCES repair_orders(id),
  CONSTRAINT fk_parts_req_requester FOREIGN KEY (requested_by_user_id) REFERENCES users(id),
  CONSTRAINT fk_parts_req_reviewer  FOREIGN KEY (reviewed_by_user_id)  REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- NEW TABLE: parts_request_items
-- ============================================================

CREATE TABLE parts_request_items (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parts_request_id    BIGINT UNSIGNED NOT NULL,
  inventory_item_id   BIGINT UNSIGNED NOT NULL,
  quantity_requested  DECIMAL(12,3) NOT NULL,
  quantity_approved   DECIMAL(12,3) NULL,   -- Có thể điều chỉnh khi duyệt
  quantity_issued     DECIMAL(12,3) NULL,   -- Thực tế xuất
  notes               VARCHAR(500) NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pri_request (parts_request_id),
  CONSTRAINT chk_pri_qty CHECK (quantity_requested > 0),
  CONSTRAINT fk_pri_request FOREIGN KEY (parts_request_id)  REFERENCES parts_requests(id),
  CONSTRAINT fk_pri_item    FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- NEW TABLE: invoices
-- ============================================================

CREATE TABLE invoices (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  repair_order_id    BIGINT UNSIGNED NOT NULL,
  invoice_number     VARCHAR(64) NOT NULL,     -- INV-YYYYMMDD-XXXX
  issued_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  issued_by_user_id  BIGINT UNSIGNED NOT NULL,
  subtotal           DECIMAL(14,2) NOT NULL DEFAULT 0,
  discount_total     DECIMAL(14,2) NOT NULL DEFAULT 0,
  tax_total          DECIMAL(14,2) NOT NULL DEFAULT 0,
  grand_total        DECIMAL(14,2) NOT NULL DEFAULT 0,
  notes              TEXT NULL,
  pdf_path           VARCHAR(500) NULL,        -- Đường dẫn file PDF
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_invoices_number (invoice_number),
  KEY idx_invoices_order (repair_order_id),
  CONSTRAINT chk_invoice_amounts CHECK (subtotal >= 0 AND discount_total >= 0 AND tax_total >= 0 AND grand_total >= 0),
  CONSTRAINT fk_invoice_order  FOREIGN KEY (repair_order_id)   REFERENCES repair_orders(id),
  CONSTRAINT fk_invoice_issuer FOREIGN KEY (issued_by_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_user_id BIGINT UNSIGNED,
  entity_type   VARCHAR(80) NOT NULL,
  entity_id     BIGINT UNSIGNED NOT NULL,
  action        VARCHAR(80) NOT NULL,
  before_data   JSON,
  after_data    JSON,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_entity     (entity_type, entity_id, created_at),
  KEY idx_audit_actor_time (actor_user_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- SEED: Reference data
-- ============================================================

-- 1. Branches
INSERT INTO branches (code, name, phone, address_line, is_active) VALUES
  ('HN-01', 'Chi nhánh Hà Nội 01', '024-1234-5678', '123 Phố Huế, Hai Bà Trưng, Hà Nội', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), phone = VALUES(phone);

-- 2. Warehouses
INSERT INTO warehouses (branch_id, code, name, is_active)
SELECT b.id, 'HN-01-MAIN', 'Kho chính HN-01', TRUE
FROM branches b WHERE b.code = 'HN-01'
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 3. Roles
INSERT INTO roles (code, name, description) VALUES
  ('ADMIN',             'Quản trị hệ thống',    'Toàn quyền hệ thống'),
  ('MANAGER',           'Quản lý chi nhánh',     'Quản lý vận hành, nhân sự và báo cáo'),
  ('RECEPTIONIST',      'Lễ tân / Tiếp nhận',   'Tiếp nhận khách hàng và thiết bị'),
  ('TECHNICIAN',        'Kỹ thuật viên',         'Chẩn đoán, sửa chữa và kiểm tra'),
  ('WAREHOUSE_MANAGER', 'Quản lý kho',           'Quản lý tồn kho và duyệt yêu cầu linh kiện'),
  ('CUSTOMER',          'Khách hàng',            'Khách hàng tự tạo đơn và xem đơn của mình')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- 4. Device types
INSERT INTO device_types (code, name, is_active) VALUES
  ('AIR_CONDITIONER', 'Máy điều hòa',  TRUE),
  ('REFRIGERATOR',    'Tủ lạnh',        TRUE),
  ('WASHING_MACHINE', 'Máy giặt',       TRUE),
  ('WATER_HEATER',    'Máy nước nóng',  TRUE),
  ('DRYER',           'Máy sấy',        TRUE),
  ('DEHUMIDIFIER',    'Máy hút ẩm',     TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), is_active = VALUES(is_active);

-- 5. Permissions
INSERT INTO permissions (code, description) VALUES
  ('system.manage',         'Quản lý người dùng, vai trò và cấu hình hệ thống'),
  ('operations.manage',     'Quản lý vận hành chi nhánh và phân công'),
  ('intake.manage',         'Quản lý khách hàng, thiết bị và tiếp nhận'),
  ('repair.manage',         'Quản lý chẩn đoán, báo giá và sửa chữa'),
  ('inventory.manage',      'Quản lý kho vật tư và tồn kho'),
  ('reports.view',          'Xem báo cáo vận hành và doanh thu'),
  ('warehouse.manage',      'Quản lý kho, duyệt yêu cầu cấp phát linh kiện'),
  ('customer.self_service', 'Khách hàng tự tạo yêu cầu và xem đơn của mình')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- 6. Role-permission assignments

-- ADMIN: all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'ADMIN';

-- MANAGER
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('operations.manage','inventory.manage','reports.view','warehouse.manage')
WHERE r.code = 'MANAGER';

-- RECEPTIONIST
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code = 'intake.manage'
WHERE r.code = 'RECEPTIONIST';

-- TECHNICIAN
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code = 'repair.manage'
WHERE r.code = 'TECHNICIAN';

-- WAREHOUSE_MANAGER
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code IN ('warehouse.manage','inventory.manage')
WHERE r.code = 'WAREHOUSE_MANAGER';

-- CUSTOMER
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
  ON p.code = 'customer.self_service'
WHERE r.code = 'CUSTOMER';

-- 7. Sample inventory items (common refrigeration parts)
INSERT INTO inventory_items (sku, name, unit, standard_cost, default_sale_price, reorder_level, is_active) VALUES
  ('GAS-R32-1KG',    'Gas lạnh R32 (1 kg)',                  'kg',     350000,  500000, 5.000, TRUE),
  ('GAS-R410A-1KG',  'Gas lạnh R410A (1 kg)',                 'kg',     380000,  550000, 5.000, TRUE),
  ('COMP-AC-MITSU',  'Cụm máy nén điều hòa Mitsubishi 1HP',  'cái',  2500000, 3800000, 2.000, TRUE),
  ('CAP-RUN-40UF',   'Tụ điện chạy 40µF 450V',               'cái',     45000,   90000, 10.000, TRUE),
  ('DRAIN-PAN-UNIV', 'Khay thoát nước điều hòa universal',   'cái',     80000,  150000, 5.000, TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), standard_cost = VALUES(standard_cost),
  default_sale_price = VALUES(default_sale_price), reorder_level = VALUES(reorder_level);

-- ============================================================
-- END OF MIGRATION 202611010001_full_schema_v2.sql
-- ============================================================
