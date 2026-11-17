# Session Log: 2026-11-01 — TASK-N01 (Customer Self-Service API)

## Bối cảnh & Mục tiêu
- **Mục tiêu**: Xây dựng toàn bộ API dành cho khách hàng tự phục vụ (Customer Self-Service Portal) theo spec nghiệp vụ mới:
  1. Đăng ký tài khoản khách hàng trực tuyến (`POST /api/v1/auth/register`).
  2. Tạo yêu cầu sửa chữa trực tuyến (`POST /api/v1/customer/requests`) kèm hình ảnh thiết bị hư hỏng, thời gian hẹn mong muốn, tự động tạo thiết bị và phiếu sửa chữa ở trạng thái `PENDING_RECEPTION`.
  3. Tra cứu danh sách đơn sửa chữa của chính mình (`GET /api/v1/customer/orders`).
  4. Xem chi tiết tiến trình, tình trạng, chi phí và thanh toán (`GET /api/v1/customer/orders/:id`).
  5. Xem danh sách thiết bị điện lạnh đã đăng ký (`GET /api/v1/customer/devices`).

## Các thay đổi đã thực hiện
1. **Service (`backend/src/services/customer-portal-service.js`)**:
   - `createServiceRequest`: Lấy hoặc tạo hồ sơ `customers`, tạo bản ghi `devices`, sinh mã yêu cầu `SR-YYYYMMDD-XXXX`, tạo `service_requests` lưu JSON ảnh, tạo `repair_orders` với mã `RO-YYYYMMDD-XXXX` và trạng thái ban đầu `PENDING_RECEPTION`.
   - `listCustomerOrders`: Danh sách đơn lọc theo `customer_id` của tài khoản đang đăng nhập, tính tổng tiền và phân trang chuẩn.
   - `getCustomerOrderDetail`: Chi tiết tiến trình sửa chữa, thiết bị, ảnh ban đầu, tài chính (công thợ, linh kiện, thuế, giảm giá, công nợ còn thiếu), các đợt thanh toán và thẻ bảo hành.
   - `listCustomerDevices`: Danh mục thiết bị khách hàng sở hữu.
2. **Routes (`backend/src/routes/customer-portal.js`)**:
   - `POST /api/v1/customer/requests`
   - `GET /api/v1/customer/orders`
   - `GET /api/v1/customer/orders/:id`
   - `GET /api/v1/customer/devices`
3. **Tích hợp (`backend/src/app.js` & `backend/package.json`)**:
   - Mount router tại `/api/v1/customer`.
   - Cập nhật kịch bản kiểm tra cú pháp `npm run lint`.
4. **Kiểm thử tự động (`backend/test/customer-portal.test.js`)**:
   - Bổ sung 4 kiểm thử validation mô tả lỗi, số điện thoại, địa chỉ và mã hóa chuỗi mảng ảnh an toàn.

## Kết quả kiểm thử
- `cd backend && npm run lint`: PASS (0 lỗi).
- `cd backend && npm test`: 48/48 tests PASS.

