# Nhật ký phiên: 2026-11-01 — Nâng cấp Giao diện Quản lý Khách hàng & Nhân sự (Admin / Manager)

## Yêu cầu người dùng
- Nâng cấp giao diện quản trị cho Admin: bổ sung tính năng quản lý khách hàng và nhân viên trực tiếp trên hệ thống.

---

## Các công việc đã thực hiện

### 1. Backend Service & Routes: Quản lý Nhân sự (`/api/v1/users`)
- **`backend/src/services/user-service.js`**:
  - `list(query)`: Danh sách nhân viên, hỗ trợ tìm kiếm đa trường (username, fullName, phone, email), lọc theo vai trò (`role`), chi nhánh (`branchId`), trạng thái (`isActive`).
  - Tự động thống kê số lượng phiếu sửa chữa đang xử lý của Kỹ thuật viên (`activeRepairsCount`) để Admin dễ dàng phân công và cân bằng tải công việc.
  - `getRoles()`: Danh mục vai trò nhân viên hợp lệ (`ADMIN`, `MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `WAREHOUSE_MANAGER`).
  - `create(body)`: Tạo tài khoản nhân sự mới kèm mã hóa mật khẩu Scrypt an toàn, kiểm tra trùng username/email, gán vai trò vào `user_roles`.
  - `get(id)` & `update(id, body)`: Chỉnh sửa thông tin nhân viên, thay đổi vai trò, đổi mật khẩu hoặc kích hoạt/tạm khóa tài khoản.
- **`backend/src/routes/users.js`**:
  - Bảo vệ bởi middleware `requireAnyPermission('system.manage', 'operations.manage')`.
  - Mounted tại `/api/v1/users` trong `backend/src/app.js`.
- **Unit Test**: `backend/test/users.test.js` kiểm tra validation payload người dùng, đảm bảo tổng số 56 tests PASS (0 lỗi).

### 2. Frontend: Quản lý Nhân sự (`/users`)
- **`frontend/src/api/users.js`**: Client API gọi các endpoint `/api/v1/users`.
- **`frontend/src/pages/UsersPage.jsx`**:
  - Danh sách nhân viên: Avatar, họ tên, username, vai trò có badge màu, thông tin liên hệ (SĐT, Email), chi nhánh, ngày tham gia.
  - Hiển thị tải công việc KTV: Badge vàng `🔧 X phiếu đang sửa` hoặc badge xanh `✓ Sẵn sàng nhận việc`.
  - Modal **+ Thêm nhân viên mới**: Nhập họ tên, tên đăng nhập, mật khẩu khởi tạo, vai trò, số điện thoại, email.
  - Modal **✏️ Sửa thông tin nhân viên**: Đổi họ tên, vai trò, số điện thoại, email, đặt lại mật khẩu mới, kích hoạt / tạm khóa tài khoản.
  - Bộ lọc tìm kiếm nhanh theo từ khóa, lọc theo vai trò và trạng thái làm việc.

### 3. Frontend: Nâng cấp Quản lý Khách hàng (`/customers`)
- **`frontend/src/pages/CustomersPage.jsx`**:
  - Bổ sung nút **"✏️ Sửa thông tin"** trong phần chi tiết khách hàng đang chọn.
  - Bổ sung Modal **Sửa thông tin khách hàng**: Cho phép Admin/Lễ tân cập nhật họ tên, số điện thoại, email, địa chỉ liên hệ và đồng bộ ngay vào danh sách.

### 4. Điều hướng & Dashboard
- **`frontend/src/components/Layout.jsx`**: Bổ sung mục điều hướng **"Quản lý Nhân viên"** (`/users`, icon `👔`) cho người dùng có quyền quản trị hệ thống (`system.manage`) hoặc quản lý vận hành (`operations.manage`).
- **`frontend/src/App.jsx`**: Đăng ký route được bảo vệ `/users`.
- **`frontend/src/pages/DashboardPage.jsx`**:
  - Bổ sung nút hành động nhanh **"👔 Quản lý Nhân viên"** trên banner chào mừng dành cho Admin.
  - Bổ sung thẻ lối tắt **"Quản lý Nhân sự & Kỹ thuật viên"** dẫn trực tiếp tới `/users`.

---

## Kết quả Kiểm thử & Trạng thái Hệ thống
- **Backend Tests**: 56/56 tests PASS (100% pass).
- **Backend API**: Running daemon trên port 3000 (`http://localhost:3000/api/v1/health` status ok).
- **Frontend Build**: Vite build PASS (53 modules, 0 lỗi).
- **Frontend Lint**: 0 lỗi (oxlint).

