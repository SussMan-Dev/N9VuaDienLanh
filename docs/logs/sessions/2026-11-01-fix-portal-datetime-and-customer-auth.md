# Nhật ký phiên: 2026-11-01 — Sửa lỗi Datetime Cổng Khách hàng & Quản lý Tài khoản/Mật khẩu Khách hàng

## 1. Vấn đề xử lý
1. **Lỗi Cổng khách hàng**: Khi khách đặt lịch hẹn, giao diện gửi chuỗi `datetime-local` (ví dụ `2026-11-05T14:30`), nhưng backend validate bằng `optionalDate` (chỉ chấp nhận `YYYY-MM-DD`), dẫn đến báo lỗi `preferredDatetime must be YYYY-MM-DD`.
2. **Yêu cầu Quản lý Khách hàng**: Quản lý khách hàng phải quản lý cả tài khoản đăng nhập và mật khẩu của khách hàng (cấp tài khoản, đổi mật khẩu, khóa/mở khóa tài khoản Cổng khách hàng).

---

## 2. Giải pháp & Các thay đổi

### A. Khắc phục lỗi `preferredDatetime`
- **`backend/src/lib/validation.js`**: Bổ sung hàm `optionalDateTime(value, field)`.
  - Hỗ trợ định dạng `YYYY-MM-DDTHH:MM`, `YYYY-MM-DD`, `YYYY-MM-DD HH:MM:SS`, chuẩn hóa sang định dạng `DATETIME` chuẩn của MySQL (`YYYY-MM-DD HH:MM:SS`).
- **`backend/src/services/customer-portal-service.js`**: Chuyển sang sử dụng `optionalDateTime` cho trường `preferredDatetime`.
- **`backend/src/routes/customer-portal.js`**: Alias cả hai endpoint `/api/v1/customer/requests` và `/api/v1/customer/service-requests` để đảm bảo tương thích tuyệt đối.
- **Unit Test**: `backend/test/customer-portal.test.js` bổ sung kiểm thử cho `optionalDateTime`.

### B. Quản lý Tài khoản & Mật khẩu Khách hàng
- **`backend/src/services/customer-service.js`**:
  - `list` và `get`: Tự động `LEFT JOIN users u ON u.customer_id = customers.id` để trả về kèm thông tin tài khoản trực tuyến `account` (`id`, `username`, `email`, `isActive`, `lastLoginAt`).
  - `create`: Hỗ trợ tùy chọn tạo tài khoản online đồng thời (`username`, `password`), kiểm tra trùng username, mã hóa mật khẩu Scrypt an toàn và gán vai trò `CUSTOMER`.
  - `setAccount(id, body)`: Cho phép Admin/Lễ tân:
    - Cấp mới tài khoản trực tuyến cho khách hàng hiện có.
    - Đặt lại mật khẩu mới cho khách hàng.
    - Cập nhật username.
    - Khóa hoặc mở khóa tài khoản trực tuyến (thu hồi toàn bộ phiên đăng nhập cũ trong `auth_sessions`).
- **`backend/src/routes/customers.js`**:
  - Bổ sung route `POST /api/v1/customers/:id/account`.
- **`frontend/src/api/customers.js`**:
  - Bổ sung hàm `setCustomerAccount(id, payload)` và mở rộng `createCustomer` nhận `username`/`password`.
- **`frontend/src/pages/CustomersPage.jsx`**:
  - Cột danh sách khách hàng hiển thị badge tài khoản online (`👤 @username` hoặc `Chưa có tài khoản online`).
  - Thẻ quản lý **"Tài khoản Cổng khách hàng"** trong phần chi tiết:
    - Hiển thị username, trạng thái hoạt động, thời điểm đăng nhập gần nhất.
    - Nút **"🔑 Đổi mật khẩu"** và nút **"🔒 Khóa tài khoản" / "🔓 Mở khóa"**.
    - Nếu khách chưa có tài khoản: nút **"+ Cấp tài khoản trực tuyến"**.
  - Modal tạo khách hàng mới có checkbox: *"Cấp tài khoản đăng nhập Cổng khách hàng ngay"*.
  - Modal **Quản lý Tài khoản & Mật khẩu**: Cho phép Admin nhập username, mật khẩu mới và kích hoạt tài khoản.

---

## 3. Kết quả Kiểm thử & Trạng thái Hệ thống
- **Backend Tests**: 57/57 tests PASS (100% pass).
- **Kiểm thử E2E kịch bản người dùng**: Script `scratch/test-customer-account-and-portal.mjs` chạy thành công toàn bộ:
  1. Admin đăng nhập.
  2. Tạo khách hàng có tài khoản `kh_user_...`.
  3. Khách hàng đăng nhập thành công với tài khoản vừa tạo.
  4. Khách hàng gửi yêu cầu sửa chữa với `preferredDatetime` kiểu `datetime-local` (`2026-11-05T14:30`) thành công (HTTP 201).
  5. Admin đổi mật khẩu khách hàng thành công (HTTP 200).
  6. Khách hàng đăng nhập thành công bằng mật khẩu mới (HTTP 200).
- **Frontend Build**: Vite build PASS (53 modules, 0 lỗi, 238ms).
- **Frontend Lint**: 0 lỗi linter.

