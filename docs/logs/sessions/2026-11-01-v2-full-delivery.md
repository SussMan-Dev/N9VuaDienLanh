# Nhật ký phiên: 2026-11-01 — Bàn giao toàn diện Hệ thống Quản lý Sửa chữa Điện lạnh v2

## Mục tiêu phiên làm việc
Hoàn tất trọn vẹn Phase U (U0, U1, U2, U3) theo đúng yêu cầu nâng cấp v2 của hệ thống quản lý dịch vụ sửa chữa điện lạnh:
- Quy trình 7 bước nghiệp vụ thực tế.
- Phân quyền RBAC 5-6 vai trò (`CUSTOMER`, `RECEPTIONIST`, `ADMIN`, `MANAGER`, `TECHNICIAN`, `WAREHOUSE_MANAGER`).
- Quản lý nhật ký sửa chữa nhiều lần kèm hình ảnh trước/sau sửa.
- Quản lý cấp phát linh kiện từ kho: KTV yêu cầu -> Kho duyệt -> Xuất kho nguyên tử (khóa `FOR UPDATE`, trừ kho, tự động cập nhật chi phí và trạng thái đơn).
- Quản lý thanh toán và hóa đơn in ấn / xuất PDF chuẩn đẹp.
- Cổng khách hàng tự phục vụ (đăng ký, tạo đơn, tra cứu tiến độ).

---

## Các công việc đã thực hiện

### 1. Nền tảng Cơ sở dữ liệu & Xác thực (Phase U0)
- Thiết kế và thực thi migration toàn diện `database/migrations/202611010001_full_schema_v2.sql` (31 bảng).
- Mở rộng RBAC: vai trò `CUSTOMER` và `WAREHOUSE_MANAGER`, 8 quyền mới liên quan đến portal, logs, requests, invoices.
- Mở rộng máy trạng thái sửa chữa với các trạng thái mới: `PENDING_RECEPTION`, `WAITING_PARTS`, `WAITING_PAYMENT`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`.
- Bổ sung endpoint đăng ký khách hàng `POST /api/v1/auth/register`, tự động liên kết tài khoản `users` với bản ghi `customers`.

### 2. Triển khai Backend API mới (Phase U1)
- **TASK-N01: Customer Portal API**:
  - `POST /api/v1/customer/service-requests`: Tạo yêu cầu có hình ảnh, tự sinh thiết bị và đơn hàng `PENDING_RECEPTION`.
  - `GET /api/v1/customer/repair-orders`: Tra cứu tiến trình các đơn của khách.
  - `GET /api/v1/customer/devices`: Tra cứu thiết bị đã đăng ký.
- **TASK-N02: Repair Logs API**:
  - `GET/POST /api/v1/repair-orders/:orderId/logs`: Ghi nhận và xem lịch sử các lần sửa chữa.
  - Hỗ trợ lưu trữ ảnh trước và sau khi xử lý (`beforeImages`, `afterImages`), phân loại tình trạng, nguyên nhân và kết quả kiểm tra.
- **TASK-N03: Parts Request & Warehouse Workflow API**:
  - `POST /api/v1/parts-requests`: KTV tạo yêu cầu cấp phát linh kiện.
  - `POST /api/v1/parts-requests/:id/approve` & `reject`: Quản lý kho duyệt hoặc từ chối kèm lý do.
  - `POST /api/v1/parts-requests/:id/issue`: Xuất kho nguyên tử bằng transaction `SELECT ... FOR UPDATE`, tự động trừ tồn kho, ghi nhận `inventory_transactions` (loại `ISSUE`), bổ sung vào `repair_order_parts`, snapshot đơn giá và tự chuyển trạng thái đơn hàng về `REPAIRING`.
- **TASK-N05: Invoice API**:
  - `GET/POST /api/v1/invoices` & `GET /api/v1/repair-orders/:orderId/invoice`: Lập hóa đơn dịch vụ, snapshot chi phí nhân công, linh kiện, phụ phí và giảm giá.
  - `GET /api/v1/invoices/:id/print`: Giao diện in ấn và xuất PDF chuyên nghiệp, tích hợp nút in tự động `window.print()`.

### 3. Triển khai Giao diện Người dùng Frontend (Phase U2)
- **API Client Layer**:
  - `frontend/src/api/repair-logs.js`
  - `frontend/src/api/parts-requests.js`
  - `frontend/src/api/invoices.js`
  - `frontend/src/api/customer-portal.js`
- **Cổng khách hàng & Đăng ký**:
  - `frontend/src/pages/RegisterPage.jsx` (`/register`): Đăng ký tài khoản khách hàng mới.
  - `frontend/src/pages/CustomerPortalPage.jsx` (`/portal`): Giao diện đặt lịch sửa chữa (loại thiết bị, thương hiệu, model, mô tả hỏng, hình ảnh URL), danh sách đơn sửa chữa cá nhân kèm tiến trình trực quan theo thời gian thực.
- **Dashboard thích ứng theo vai trò**:
  - `frontend/src/pages/DashboardPage.jsx`: Tùy biến banner chào mừng, nút hành động nhanh và danh sách lối tắt phù hợp với từng vai trò (`CUSTOMER`, `WAREHOUSE_MANAGER`, `TECHNICIAN`, `RECEPTIONIST`, `ADMIN`).
- **Nâng cấp Chi tiết Phiếu sửa chữa (`/repairs/:id`)**:
  - Tab "Nhật ký sửa" (Repair Logs): Danh sách các lần sửa kèm hình ảnh trước/sau và modal "Ghi nhật ký sửa chữa mới".
  - Tab "Cấp phát kho" (Parts Requests): Xem danh sách yêu cầu cấp phát, nút "Yêu cầu cấp linh kiện" cho KTV, và các nút Duyệt/Từ chối/Xuất kho cho Quản lý kho.
  - Nút "🖨 In / Xuất hóa đơn PDF" trong tab "Thanh toán & Thu tiền".
- **Quản lý Kho (`/inventory`)**:
  - Bổ sung Tab 4 "📑 Yêu cầu cấp phát": Hiển thị các yêu cầu cấp phát linh kiện từ các KTV, xem chi tiết số lượng đề xuất/duyệt/đã xuất, thao tác phê duyệt, từ chối và xuất kho tự động.

### 4. Kiểm thử & Đảm bảo Chất lượng (Phase U3)
- **Backend Tests**: 52/52 tests PASS (0 failed, 4 test suites).
- **Frontend Build**: Vite build thành công 100% (51 modules transformed, 0 lỗi).
- **Frontend Lint**: 0 lỗi (oxlint).
- **Tài liệu**: Cập nhật đồng bộ `API_SPEC.md`, `DATABASE.md`, `BUSINESS_RULES.md`, `docs/tasks/README.md`, `WORKLOG.md`.

---

## Thông tin Vận hành & Tài khoản kiểm thử
- **URL Frontend**: `http://localhost:5173`
- **URL Backend**: `http://localhost:3000`
- **Tài khoản Quản trị**:
  - Tên đăng nhập: `admin`
  - Mật khẩu: `Admin@12345678`
- **Đăng ký tài khoản Khách hàng**: Truy cập trực tiếp trang `/register` hoặc click "Đăng ký tài khoản" tại màn hình đăng nhập.

