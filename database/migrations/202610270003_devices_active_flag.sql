-- Apply after 202610270002. Devices are retained for repair history; deactivate instead of hard delete.
ALTER TABLE devices ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER purchase_date;
CREATE INDEX idx_devices_customer_active ON devices (customer_id, is_active);
# Thay bằng mật khẩu MỚI của bạn tại máy, không gửi vào chat.

