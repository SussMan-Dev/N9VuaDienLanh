# Session Log: Cổng Khách Hàng - Quản Lý Hồ Sơ Thiết Bị & Danh Mục Thiết Bị Hỗ Trợ

**Ngày:** 2026-11-01
**Yêu cầu:** "khách hàng họ cần biết những thiết bị mình có" (Khách hàng cần biết những thiết bị mình có/sở hữu, lịch sử sửa chữa của máy và danh mục các thiết bị trung tâm nhận bảo dưỡng, sửa chữa).

## 1. Phân tích & Giải pháp

Trước đây, tại Cổng Khách hàng (`/portal`):
- Giao diện chỉ hiển thị danh sách các "Đơn sửa chữa", không có khu vực riêng để khách hàng xem toàn bộ hồ sơ thiết bị mà mình sở hữu.
- Khách hàng không thể chủ động thêm mới thiết bị vào tài khoản nếu chưa gửi yêu cầu sửa chữa.
- Khách hàng chưa nắm được trung tâm hỗ trợ những dòng máy nào và chính sách bảo hành ra sao.

## 2. Các tính năng đã triển khai

### 2.1. Backend API (`backend/src/services/customer-portal-service.js`, `backend/src/routes/customer-portal.js`)
- **`GET /api/v1/customer/devices`**: Bổ sung thống kê chi tiết cho từng thiết bị của khách:
  - `totalRepairs`: Tổng số lần thiết bị đã sửa chữa tại cửa hàng.
  - `latestRepairCode` & `latestRepairStatus`: Mã đơn và trạng thái sửa chữa gần nhất.
  - `latestRepairedAt`: Ngày sửa chữa gần nhất.
  - Phân loại thiết bị (`typeName`, `typeCode`, `typeId`).
- **`POST /api/v1/customer/devices`**: Cho phép khách hàng chủ động khai báo thiết bị mới vào hồ sơ (loại máy, hãng sản xuất, model, số serial, vị trí đặt máy).
- **`GET /api/v1/customer/device-types`**: Trả về danh sách 6 dòng thiết bị trung tâm hỗ trợ (Máy điều hòa, Tủ lạnh, Máy giặt, Máy nước nóng, Máy sấy, Máy hút ẩm).

### 2.2. Frontend (`frontend/src/pages/CustomerPortalPage.jsx`, `frontend/src/api/customer-portal.js`, `frontend/src/index.css`)
- Nâng cấp thanh điều hướng 3 Tab chính:
  1. 📱 **Thiết bị của tôi (`devices`)**:
     - Hiển thị danh thiếp (Card) từng thiết bị với biểu tượng trực quan (❄️ Điều hòa, 🧊 Tủ lạnh, 🧺 Máy giặt, ♨️ Máy nước nóng, 🌬️ Máy sấy, 💧 Máy hút ẩm).
     - Hiển thị hãng sản xuất, model, số serial (tem máy), vị trí đặt máy (Phòng khách, bếp...).
     - Lịch sử số lần sửa chữa và trạng thái xử lý đơn hàng gần nhất.
     - Thanh tìm kiếm lọc thiết bị nhanh chóng theo từ khóa.
     - Nút **"🔧 Đặt sửa máy này"** trên mỗi thẻ thiết bị: tự động điền sẵn máy vào form yêu cầu sửa chữa.
  2. 📋 **Đơn sửa chữa (`orders`)**: Danh sách phiếu sửa chữa kèm timeline tiến độ, chi phí, hóa đơn in và bảo hành.
  3. 🛠 **Dòng máy tiếp nhận (`types`)**: Danh mục 6 loại thiết bị trung tâm nhận sửa chữa kèm chi tiết các lỗi thường gặp, chính sách bảo hành 3-12 tháng và nút đặt lịch kiểm tra tận nơi.
- **Modal "+ Thêm thiết bị"**: Form trực quan cho phép khách hàng chọn loại thiết bị, nhập hãng, model, số serial và vị trí trong nhà.
- **Modal "Yêu cầu sửa chữa mới"**: Tích hợp danh sách thiết bị đã lưu để khách hàng chọn 1 click, hoặc chọn khai báo máy mới.

## 3. Kiểm thử

- **58/58 backend unit tests PASS** (`npm test`).
- Kiểm thử E2E API: Thêm thiết bị mới, lấy danh mục thiết bị, lấy danh sách máy của khách hàng hoạt động chính xác.
- Frontend build PASS (0 lỗi), Vite dev server sẵn sàng.

