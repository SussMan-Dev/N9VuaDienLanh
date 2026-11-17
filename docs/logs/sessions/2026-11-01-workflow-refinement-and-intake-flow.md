# Session Log: Hoàn thiện Luồng Quy Trình Tiếp Nhận Đơn (Khách hàng & Lễ tân)

**Ngày:** 2026-11-01
**Yêu cầu:** "xem và chỉnh lại flow dự án, luồng hoạt động khi tiếp nhận đơn hàng từ tài khoản khách hoặc lễ tân"

## 1. Phân tích hiện trạng & Điểm nghẽn

1. **Luồng A - Khách hàng tạo đơn trực tuyến (`/portal`)**:
   - Khách hàng tạo yêu cầu trực tuyến, hệ thống sinh mã đơn hàng và đưa vào trạng thái `PENDING_RECEPTION`.
   - **Điểm nghẽn**: Khi Lễ tân mở chi tiết đơn hàng hoặc danh sách đơn hàng, không có nút xác nhận tiếp nhận đơn. Khi Lễ tân cố gắng chuyển trạng thái, hệ thống chặn lỗi 403 `NOT_ASSIGNED` vì Lễ tân không phải là KTV được phân công.
2. **Luồng B - Lễ tân tiếp nhận tại quầy (`/repairs/new`)**:
   - Khi khách hàng mới đến quầy hoặc có máy mới, form tiếp nhận bắt buộc người dùng điều hướng sang `/customers` làm gián đoạn và mất dữ liệu đang nhập.
3. **Cơ sở dữ liệu**:
   - Ràng buộc CHECK `chk_repair_status` và `chk_history_status` trong MySQL trước đó thiếu các trạng thái v2 (`ASSIGNED`, `IN_PROGRESS`, `WAITING_PAYMENT`, `COMPLETED`), dẫn đến lỗi vi phạm check constraint khi phân công KTV hoặc chuyển tiến trình sửa chữa.

## 2. Các thay đổi và tối ưu đã thực hiện

### 2.1. Cơ sở dữ liệu & Migration
- Viết và áp dụng migration mới `202611010002_expand_repair_status_check_constraints.sql`:
  - Mở rộng `chk_repair_status` trên `repair_orders` và `chk_history_status` trên `repair_status_history` bao gồm đầy đủ 15 trạng thái của hệ thống.

### 2.2. Backend State Machine & Service
- **`backend/src/services/repair-order-service.js`**:
  - Bổ sung quyền cho vai trò `RECEPTIONIST` và quyền `intake.manage` được phép thực hiện các chuyển đổi trạng thái tiếp nhận (`PENDING_RECEPTION` -> `RECEIVED`), hủy đơn (`CANCELLED`), và thanh toán hoàn tất (`WAITING_PAYMENT` -> `COMPLETED`).
  - Khi tiếp nhận đơn: tự động cập nhật `received_at = UTC_TIMESTAMP()`, `received_by_user_id = ID của Lễ tân`, và cập nhật `service_requests.status = 'CONVERTED'`.
- **`backend/src/services/workflow-service.js`**:
  - Khi Admin/Quản lý phân công Kỹ thuật viên (assign technician), đơn hàng ở trạng thái `RECEIVED` tự động chuyển sang `ASSIGNED` và lưu vết lịch sử theo đúng Bước 3 trong đặc tả nghiệp vụ.
- **`backend/src/routes/repair-orders.js`**:
  - Middleware `canTransition` mở rộng cho phép `intake.manage` / `RECEPTIONIST` thao tác endpoint `/api/v1/repair-orders/:id/status-transitions`.

### 2.3. Frontend UX & Luồng thao tác
- **`frontend/src/pages/RepairDetailPage.jsx`**:
  - Tích hợp đầy đủ các nút hành động theo từng bước trong quy trình 7 bước:
    - Khi đơn ở `PENDING_RECEPTION`: Nút **"✅ Lễ tân xác nhận tiếp nhận đơn"** và **"❌ Từ chối tiếp nhận"**.
    - Khi đơn ở `RECEIVED`: Nút **"👔 Phân công Kỹ thuật viên"**, **"▶ Bắt đầu xử lý"**, **"🔬 Chẩn đoán lỗi"**.
    - Khi đơn ở `ASSIGNED`: Nút **"▶ KTV nhận việc & bắt đầu sửa chữa"** (`IN_PROGRESS`).
    - Khi đơn ở `IN_PROGRESS` / `REPAIRING`: Nút **"⚙️ Yêu cầu linh kiện kho"**, **"✔ Hoàn thành sửa chữa (Chờ thanh toán)"** (`WAITING_PAYMENT`).
    - Khi đơn ở `WAITING_PARTS`: Cảnh báo chờ xuất kho và nút tiếp tục sửa chữa.
    - Khi đơn ở `WAITING_PAYMENT`: Nút **"💳 Mở tab Thu tiền"** và **"✅ Xác nhận đã thanh toán & Hoàn tất"** (`COMPLETED`).
    - Khi đơn ở `COMPLETED` / `READY_FOR_PICKUP`: Nút **"🎁 Bàn giao máy cho khách"** (`DELIVERED`).
- **`frontend/src/pages/RepairsListPage.jsx`**:
  - Bổ sung thanh Tab lọc nhanh trạng thái: *Tất cả, 🔔 Chờ tiếp nhận, 📥 Đã tiếp nhận, 👔 Đã phân công, 🔧 Đang xử lý, 📦 Chờ linh kiện, 💳 Chờ thanh toán, ✅ Hoàn thành*.
  - Thêm nút thao tác 1-click **"✅ Tiếp nhận"** ngay trên từng dòng đơn `PENDING_RECEPTION`.
- **`frontend/src/pages/RepairIntakePage.jsx`**:
  - Tích hợp 2 modal popup thêm nhanh: **"+ Thêm nhanh khách hàng mới"** và **"+ Thêm nhanh thiết bị mới"** ngay tại màn hình tiếp nhận, giúp Lễ tân lập phiếu mượt mà không bị rời trang.
- **`frontend/src/pages/DashboardPage.jsx`**:
  - Thêm thẻ cảnh báo thông báo nổi bật màu hổ phách: *"Có X yêu cầu sửa chữa trực tuyến đang chờ tiếp nhận"* kèm nút chuyển nhanh tới danh sách tiếp nhận.

## 3. Kết quả kiểm thử & Nghiệm thu
- **58/58 backend tests PASS** (`npm test`).
- Kiểm thử E2E vòng đời hoàn chỉnh:
  - Khách hàng gửi yêu cầu online -> HTTP 201 (`PENDING_RECEPTION`).
  - Lễ tân xác nhận tiếp nhận -> HTTP 200 (`RECEIVED`).
  - Admin phân công KTV -> HTTP 201 (tự động chuyển `ASSIGNED`).
  - KTV bắt đầu sửa chữa -> HTTP 200 (`IN_PROGRESS`).
  - KTV hoàn thành sửa chữa -> HTTP 200 (`WAITING_PAYMENT`).
  - Lễ tân thu tiền & hoàn tất đơn -> HTTP 200 (`COMPLETED`).
- Frontend: `npm run lint` 0 lỗi, `npm run build` thành công (**0 lỗi**).

