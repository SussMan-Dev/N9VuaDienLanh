-- Authentication sessions and default permission matrix. Apply after 202610270001.
CREATE TABLE auth_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user_active (user_id, revoked_at, expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO permissions (code, description) VALUES
  ('system.manage', 'Manage users, roles and configuration'),
  ('operations.manage', 'Manage branch operations and assignments'),
  ('intake.manage', 'Manage customers, devices and intake'),
  ('repair.manage', 'Manage diagnosis, quotes and repairs'),
  ('inventory.manage', 'Manage inventory and stock'),
  ('reports.view', 'View operational and revenue reports')
ON DUPLICATE KEY UPDATE description = VALUES(description);
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE r.code = 'ADMIN';
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN ('operations.manage','inventory.manage','reports.view') WHERE r.code = 'MANAGER';
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'intake.manage' WHERE r.code = 'RECEPTIONIST';
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'repair.manage' WHERE r.code = 'TECHNICIAN';
