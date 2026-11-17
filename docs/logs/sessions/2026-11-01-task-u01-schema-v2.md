# Session: TASK-U01 – Full Schema v2 Migration
**Ngày:** 2026-11-01  
**Task:** TASK-U01

## Mục tiêu
Viết migration SQL mới thay thế 3 migration cũ, nâng cấp schema để hỗ trợ spec v2.

## Việc đã làm
1. Đọc 3 migration cũ (`202610270001-03`) để hiểu schema hiện tại.
2. Viết `202611010001_full_schema_v2.sql` (DROP + CREATE đầy đủ 31 bảng + seed).
3. Chạy migration qua `node --input-type=module` với `multipleStatements: true` → OK.
4. Bootstrap admin `admin / Admin@12345678` tại branch `HN-01` → OK.
5. Xác minh 31 bảng tạo đúng qua `SHOW TABLES`.
6. Chạy `npm test` → 34/34 PASS.
7. Cập nhật `docs/tasks/README.md` (TASK-U01 → DONE) và `docs/logs/WORKLOG.md`.

## Thay đổi schema
### Bảng mới
- `repair_logs` – nhật ký sửa chữa nhiều lần/phiếu
- `parts_requests` – yêu cầu cấp phát linh kiện từ KTV
- `parts_request_items` – chi tiết từng mặt hàng trong yêu cầu
- `invoices` – hóa đơn tách biệt với payment

### Bảng mở rộng
- `repair_orders`: thêm `PENDING_RECEPTION` + `WAITING_PARTS` vào CHECK constraint status, thêm cột `technician_cost_estimate`
- `repair_status_history`: cập nhật CHECK constraint tương ứng
- `service_requests`: thêm `images JSON`, `contact_phone`, `preferred_datetime`
- `users`: thêm `customer_id` FK → customers

### Seed data mới
- Roles: CUSTOMER, WAREHOUSE_MANAGER (+ 4 roles cũ)
- Permissions: `warehouse.manage`, `customer.self_service` (+ 6 permissions cũ)
- Role-permission matrix: 6 roles × permissions tương ứng
- Device types: 6 loại thiết bị điện lạnh
- Inventory items: 5 linh kiện điện lạnh mẫu

## Kết quả nghiệm thu
- ✅ Migration chạy OK, không lỗi
- ✅ 31 bảng tạo đúng
- ✅ Admin bootstrap thành công: `admin / Admin@12345678`
- ✅ 34 backend tests PASS
