# Database

`repair_status_history` is append-only. Repair-order creation writes the initial `NULL -> RECEIVED` history row in the same transaction. Every later transition updates `repair_orders` and inserts its actor, UTC timestamp, old/new status, and reason in the same transaction.

## Phân công, chẩn đoán và báo giá (TASK-007)
- `repair_assignments`: Mỗi phiếu sửa chữa có tối đa một kỹ thuật viên phụ trách tích cực (`unassigned_at IS NULL`). Khi phân công kỹ thuật viên mới, phân công cũ được gán `unassigned_at = UTC_TIMESTAMP()` trong cùng transaction.
- `diagnostics`: Lưu chẩn đoán lỗi, đề xuất xử lý và ước tính nhân công của kỹ thuật viên phụ trách hoặc quản lý.
- `quotes` & `quote_items`: Báo giá có `version_no` tăng dần cho mỗi phiếu (`repair_order_id, version_no`). Các hạng mục chi tiết được lưu trong `quote_items` (phân loại `LABOR` hoặc `PART`).
- `quote_decision_history`: Ghi lại toàn bộ lịch sử gửi báo giá (`SENT`), khách hàng đồng ý (`APPROVED`) hoặc từ chối (`REJECTED`) kèm thời điểm, người ghi nhận, tên người liên hệ và lý do/ghi chú.
- Snapshot tiền: Khi một báo giá được phê duyệt (`APPROVED`), các trường `labor_total`, `parts_total`, `discount_total`, `tax_total` trên bảng `repair_orders` được cập nhật đồng bộ để phản ánh đúng số tiền đã thỏa thuận.

## Quản lý kho và vật tư sửa chữa (TASK-008)
- `inventory_stocks`: Quản lý tồn theo cặp `(warehouse_id, inventory_item_id)`. Thao tác xuất kho hoặc điều chỉnh giảm thực hiện `SELECT ... FOR UPDATE` trong transaction và kiểm tra điều kiện `quantity_on_hand >= quantity` để ngăn chặn tồn âm và race condition.
- `inventory_transactions`: Sổ biến động kho append-only. Các loại giao dịch: `RECEIPT`, `ISSUE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`. Lưu snapshot giá vốn (`unit_cost_snapshot`) và liên kết phiếu sửa chữa nếu có (`repair_order_id`).
- `repair_order_parts`: Lưu chi tiết vật tư dùng cho phiếu sửa chữa kèm snapshot giá vốn (`unit_cost_snapshot`), giá bán (`unit_price_snapshot`) và thành tiền (`line_total`). Thao tác thêm vật tư tự động xuất kho từ kho của chi nhánh thuộc phiếu; thao tác xóa vật tư (khi phiếu đang sửa chữa) tự động hoàn lại tồn kho trong cùng transaction.

## Thanh toán, công nợ và bảo hành (TASK-009)
- `payments`: Lưu lịch sử thanh toán nhiều lần cho từng phiếu sửa chữa. Mỗi lần thanh toán sinh một mã biên lai duy nhất `receipt_number` (`REC-...`). Quản lý có thể hủy thanh toán (`status = 'VOIDED'`) kèm ghi nhận người hủy và lý do.
- Công nợ dẫn xuất:
  - Phải thu = `labor_total + parts_total - discount_total + tax_total`.
  - Đã thu = Tổng `amount` của các bản ghi `payments` có `status = 'VALID'`.
  - Công nợ (`balance`) = Phải thu - Đã thu.
  - Trạng thái thanh toán: `UNPAID` (đã thu = 0), `PARTIALLY_PAID` (0 < đã thu < phải thu), `PAID` (công nợ = 0), `OVERPAID` (đã thu > phải thu).
- Giao máy (`DELIVERED`): Kiểm tra công nợ bằng 0 (`balance <= 0`) trước khi cho phép chuyển trạng thái giao máy (trừ ngoại lệ quản lý override có lý do).
- `warranties`: Lưu điều kiện và thời hạn bảo hành (`ends_at >= starts_at`) sau khi sửa chữa. Tra cứu nhanh thông qua mã `warranty_code` (`WAR-...`).
- Phiếu bảo hành / sửa lại: Cột `original_repair_order_id` trên bảng `repair_orders` liên kết phiếu sửa chữa mới tới phiếu sửa chữa gốc.

## Quy ước
- MySQL 8+, `utf8mb4`, InnoDB; primary key `BIGINT UNSIGNED`; thời điểm `DATETIME` UTC.
- Bảng nghiệp vụ có `created_at`, `updated_at`; không xóa cứng phiếu đã có lịch sử.
- Migration: `YYYYMMDDHHMM_description.sql`; chỉ thêm migration sau khi đã áp dụng môi trường chia sẻ.
## Phạm vi migration đầu tiên
`database/migrations/202610270001_initial_schema.sql` chạy một lần trên database trống với MySQL 8.0.16+. `database/seeds/001_development_reference_data.sql` là seed idempotent, không tạo tài khoản, mật khẩu hay dữ liệu khách hàng thật.
## Mô hình dữ liệu v2
Migration `database/migrations/202611010001_full_schema_v2.sql` chuẩn hóa toàn diện 31 bảng với các thành phần mới:
- `repair_logs`: Cho phép ghi nhiều lần nhật ký sửa chữa trên cùng một phiếu. Lưu chi tiết `initial_condition`, `root_cause`, `work_performed`, `test_result`, `before_images` (JSON array URLs), `after_images` (JSON array URLs), `notes`, `performed_at`.
- `parts_requests` & `parts_request_items`: Kỹ thuật viên lập yêu cầu cấp phát linh kiện từ kho. Hỗ trợ quy trình phê duyệt (`PENDING` -> `APPROVED` / `REJECTED`) và xuất kho nguyên tử (`ISSUED`). Khi xuất kho: tự động trừ `inventory_stocks.quantity_on_hand` (khóa `FOR UPDATE`), tạo giao dịch `ISSUE`, thêm vật tư vào `repair_order_parts` và cập nhật `parts_total`.
- `invoices`: Hóa đơn dịch vụ chuẩn hóa với mã `INV-...`, lưu snapshot tổng chi phí nhân công (`labor_cost`), linh kiện (`parts_cost`), phát sinh (`other_cost`), giảm giá (`discount_amount`), tổng cộng (`grand_total`), hình thức thanh toán và người lập.
- `users.customer_id`: Liên kết 1-1 giữa tài khoản người dùng đăng ký qua cổng khách hàng với hồ sơ `customers`.

| Bảng | Vai trò | Quan hệ |
| --- | --- | --- |
| `repair_logs` | Nhật ký sửa chữa nhiều lần | n-1 `repair_orders`, n-1 `users` |
| `parts_requests` | Yêu cầu cấp phát linh kiện | n-1 `repair_orders`, n-1 `users` (requested/reviewed) |
| `parts_request_items` | Chi tiết linh kiện trong yêu cầu | n-1 `parts_requests`, n-1 `inventory_items` |
| `invoices` | Hóa đơn thanh toán dịch vụ | n-1 `repair_orders`, n-1 `customers`, n-1 `users` |
| `users` | Tài khoản và vai trò | phân công/thao tác (kèm `customer_id`) |
| `customers` | Khách hàng | 1-n `devices` |
| `devices` | Thiết bị | n-1 customer, 1-n orders |
| `repair_orders` | Phiếu trung tâm | n-1 device, user |
| `repair_status_history` | Lịch sử trạng thái | n-1 order, actor |
| `diagnostics` | Chẩn đoán | n-1 order |
| `quotes` | Báo giá | n-1 order |
| `repair_order_parts` | Vật tư | n-1 order |
| `payments` | Thanh toán | n-1 order |
| `inventory_items` | Danh mục vật tư và tồn hiện tại | 1-n lịch sử kho |
| `inventory_transactions` | Nhập/xuất/điều chỉnh kho | n-1 item, có thể n-1 order |
| `warranties` | Bảo hành và sửa chữa lại | n-1 order, liên kết phiếu gốc |
| `branches` | Chi nhánh vận hành | 1-n warehouses, users, orders |
| `warehouses` | Kho thuộc một chi nhánh | 1-n tồn và biến động kho |
| `inventory_stocks` | Tồn theo kho-vật tư | unique warehouse + item |
| `inventory_transactions` | Sổ biến động kho | nhập/xuất/điều chỉnh/trả |
| `roles`, `permissions` | Phân quyền có thể điều chỉnh | n-n qua bảng nối |
| `service_requests` | Yêu cầu trước khi lập phiếu | tối đa 1 repair order |
| `audit_logs` | Dấu vết quan trọng | actor + entity + before/after |
## Toàn vẹn
- `repair_orders.code` duy nhất và bất biến.
- Migration `202610270003_devices_active_flag.sql` thêm `devices.is_active`; dùng deactivate để bảo toàn lịch sử thiết bị.
- Migration `202611010002_expand_repair_status_check_constraints.sql` mở rộng ràng buộc kiểm tra CHECK `chk_repair_status` và `chk_history_status` hỗ trợ đầy đủ 15 trạng thái: `PENDING_RECEPTION`, `RECEIVED`, `ASSIGNED`, `DIAGNOSING`, `WAITING_APPROVAL`, `APPROVED`, `IN_PROGRESS`, `REPAIRING`, `WAITING_PARTS`, `WAITING_PAYMENT`, `READY_FOR_PICKUP`, `COMPLETED`, `DELIVERED`, `CANCELLED`, `UNREPAIRABLE`.
- Migration `202611020001_roles_10_stages_and_two_tier_quote.sql` bổ sung:
  - Role mới `ACCOUNTANT` (Kế toán), `WAREHOUSE_STAFF` (Thủ kho) và permission `billing.manage`.
  - Mở rộng ràng buộc kiểm tra CHECK hỗ trợ các trạng thái mới: `PENDING`, `ACCEPTED`, `REJECTED`, `AWAITING_ADMIN_APPROVAL`, `AWAITING_CUSTOMER_APPROVAL`, `PAID`.
  - Thêm cột `rejection_reason TEXT`, `paid_at DATETIME` vào bảng `repair_orders`.
  - Thêm các cột thẩm định hai tầng vào bảng `quotes`: `admin_approval_status`, `admin_approval_notes`, `admin_approved_by_user_id`, `admin_approved_at`, `is_supplemental`.
  - Seed tài khoản Kế toán mặc định `ketoan_hoa` / `Admin@12345678`.
- Migration `202611140001_user_device_tokens.sql` bổ sung bảng `user_device_tokens`:
  - Quản lý token thông báo đẩy thiết bị di động (FCM / Expo Push Token) cho từng người dùng.
  - Cấu trúc: `id BIGINT AUTO_INCREMENT`, `user_id BIGINT UNSIGNED NOT NULL`, `token VARCHAR(255) NOT NULL`, `device_type VARCHAR(32) DEFAULT 'MOBILE'`, `last_used_at DATETIME`, `created_at DATETIME`.
  - Ràng buộc: `UNIQUE KEY uk_user_token (user_id, token)`, Foreign Key tham chiếu `users(id) ON DELETE CASCADE`.
- Thiết bị phải thuộc khách hàng của phiếu; tiền dùng `DECIMAL(12,2)`.
- Lịch sử trạng thái chỉ thêm, không sửa/xóa.
- Giá vật tư/công tại giao dịch phải được snapshot trên phiếu; trạng thái sửa chữa và thanh toán độc lập.
- Xuất kho phải kiểm tra tồn và cập nhật nguyên tử trong transaction.
## Nhiều chi nhánh và kho
- Mỗi kho thuộc đúng một chi nhánh. Tồn được ghi theo cặp `warehouse_id` và `inventory_item_id`, không phải chỉ theo toàn hệ thống.
- Phiếu sửa chữa thuộc một chi nhánh; tài khoản có một chi nhánh mặc định. Quyền truy cập chi tiết sẽ được thực thi ở TASK-004.
- Điều chuyển liên kho là phạm vi TASK-008 và phải ghi hai biến động liên kết trong cùng transaction.
## Giá trị dẫn xuất
- Phải thu = `labor_total + parts_total - discount_total + tax_total`.
- Đã thu = tổng thanh toán `VALID`; công nợ là phải thu trừ đã thu. Backend tính các giá trị này, không tin số frontend gửi lên.
- Cột, index, foreign key cụ thể được chốt tại TASK-002.
