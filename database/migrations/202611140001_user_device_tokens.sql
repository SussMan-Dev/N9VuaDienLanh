-- Migration 202611140001: FCM Push Notification Infrastructure
-- Creates user_device_tokens table for mobile push notifications

CREATE TABLE IF NOT EXISTS user_device_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL,
  device_type VARCHAR(32) NOT NULL DEFAULT 'MOBILE',
  last_used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_device_token (user_id, token),
  KEY idx_user_tokens (user_id),
  CONSTRAINT fk_user_device_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
