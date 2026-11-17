# Session Log: Phân công KTV theo tên, xóa thông báo 3000 ở Login, và phân công KTV cho Admin sau khi Lễ tân duyệt (2026-11-15)

## 1. Yêu cầu người dùng
1. Phân công KTV: Chọn tên thay vì nhập ID thủ công.
2. Xóa thông báo "đã kết nối thành công ... :3000" ở màn hình Đăng nhập (Login).
3. Sau khi Lễ tân duyệt đơn (`ACCEPTED`), Admin là người phân công KTV.

## 2. Công việc đã thực hiện

### 2.1. Xóa thông báo kết nối 3000 ở LoginScreen (`mobile/src/screens/auth/LoginScreen.tsx`)
- Sửa điều kiện render khối thông báo trạng thái kết nối server: chỉ hiển thị khi `connectionStatus && !connectionStatus.ok` (khi gặp sự cố mất kết nối mạng để người dùng biết bấm vào cấu hình).
- Khi kết nối thành công, không hiển thị banner xanh `Đã kết nối thành công: ...:3000` làm rối giao diện đăng nhập.

### 2.2. Phân công KTV chọn theo tên (không nhập ID thủ công)
- Bổ sung hàm `listTechnicians()` trong `mobile/src/api/repairs.ts` gọi `GET /api/v1/technicians`.
- Nâng cấp endpoint `GET /api/v1/technicians` trong `backend/src/routes/repair-orders.js` trả về danh sách KTV kèm `id`, `username`, `fullName`, `phone`.
- Thiết kế Modal phân công KTV trực quan:
  - Hiển thị danh sách cuộn danh sách Kỹ thuật viên (Avatar `👨‍🔧`, Tên hiển thị đầy đủ, `@username`, SĐT).
  - Người dùng bấm chọn trực tiếp vào tên KTV (hiển thị radio dot và viền xanh làm nổi bật KTV được chọn).
  - Loại bỏ hoàn toàn ô `TextInput` nhập ID dạng số.
  - Áp dụng đồng bộ cho cả `AdminDashboardScreen` và `ReceptionistDashboardScreen`.

### 2.3. Quy trình: Sau khi Lễ tân duyệt thì Admin phân công KTV
- **Backend**: Cập nhật quyền `repair` trong `backend/src/routes/repair-orders.js` để tài khoản `ADMIN` và `MANAGER` luôn có toàn quyền phân công kỹ thuật viên qua `POST /api/v1/repair-orders/:id/assignments`.
- **Lễ tân (`ReceptionistDashboardScreen.tsx`)**:
  - Khi bấm `✅ Tiếp nhận`, phiếu chuyển sang `ACCEPTED` và thông báo: `Đơn hàng đã chuyển sang ĐÃ TIẾP NHẬN (ACCEPTED). Admin hoặc Lễ tân có thể phân công Kỹ thuật viên phụ trách.`
- **Admin (`AdminDashboardScreen.tsx`)**:
  - Tích hợp 2 tab tác nghiệp:
    - Tab 1: `🔧 Chờ Phân Công (${acceptedOrders.length})`: Tự động nạp toàn bộ các đơn ở trạng thái `ACCEPTED` (đã được lễ tân duyệt). Mỗi thẻ đơn có đầy đủ thông tin khách hàng, số điện thoại bấm gọi ngay, thiết bị, lỗi khách báo, địa chỉ, giờ hẹn, và nút **`🔧 Phân công Kỹ thuật viên`**.
    - Tab 2: `📋 Duyệt Báo Giá (${pendingQuotes.length})`: Danh sách báo giá KTV gửi lên chờ Admin thẩm định duyệt tầng 1.
  - Khi Admin bấm `🔧 Phân công Kỹ thuật viên`, mở modal chọn KTV theo tên và ghi chú phân công. Sau khi xác nhận, đơn tự động chuyển sang `ASSIGNED` và kích hoạt thông báo đến ứng dụng của KTV.

## 3. Kiểm thử & Nghiệm thu
- Mobile TypeScript: `npx tsc --noEmit` ➔ **0 lỗi (PASS 100%)**.
- Backend Unit Tests: `npm test` ➔ **63/63 PASS**.
- Full Test Suite: `npm run test:all` ➔ **8 test suites PASS 100%**.
- Tự động sinh tài liệu: `npm run docs:generate` ➔ **Đã cập nhật FULL_PROJECT_DOCUMENTATION.md & HTML**.
