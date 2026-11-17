# Session Log: Làm giàu thông tin hiển thị các đơn hàng trên Mobile App (2026-11-15)

## 1. Mục tiêu
- Đáp ứng yêu cầu người dùng: "các đơn dc liệt kê nên có thêm thông tin cụ thể để dễ sử dụng" và hoàn thiện trải nghiệm đặt lịch cho Khách hàng.
- Nâng cấp dữ liệu trả về từ backend và giao diện hiển thị danh sách đơn sửa chữa trên các màn hình Mobile App cho cả 4 vai trò tác nghiệp chính:
  1. Khách hàng (`CustomerOrderListScreen.tsx` & `OrderTrackingScreen.tsx`)
  2. Kỹ thuật viên (`WorkOrderListScreen.tsx`)
  3. Lễ tân (`ReceptionistDashboardScreen.tsx`)
  4. Thu ngân / Kế toán (`AccountantDashboardScreen.tsx`)

## 2. Công việc thực hiện

### Backend:
- `backend/src/services/repair-order-service.js`:
  - Mở rộng câu lệnh SQL `select` thực hiện `LEFT JOIN` với các bảng `customers`, `devices`, `device_types`, `service_requests`, `users tu` (Kỹ thuật viên), và subquery nhóm `payments` (`status = 'VALID'`).
  - Hàm `map(row)` tính toán và trả về đầy đủ các trường: `customerName`, `customerPhone`, `customerAddress`, `deviceType`, `deviceBrand`, `deviceModel`, `preferredDatetime`, `assignedTechnicianName`, `assignedTechnicianPhone`, `totalAmount`, `totalReceivable`, `totalPaid`, `totalCollected`, `balance`, `balanceDue`.
  - Hỗ trợ tham số lọc trạng thái linh hoạt cả `query.repairStatus` lẫn `query.status`.
- `backend/src/services/customer-portal-service.js`:
  - Nâng cấp `listCustomerOrders` JOIN thông tin thiết bị, KTV được phân công, lịch hẹn ưu tiên, số điện thoại liên hệ, thông tin báo giá đang chờ duyệt.
  - Cập nhật mật khẩu cho các tài khoản khách hàng mẫu (`kh_tuanhm`, `client`, `khachhang_test`) về `password123`.

### Mobile Frontend:
- `mobile/src/api/repairs.ts`:
  - Đồng bộ `listRepairOrders` tự động ánh xạ `params.status` sang `params.repairStatus` đảm bảo backend nhận diện chính xác ở mọi màn hình.
- `mobile/src/screens/customer/CustomerOrderListScreen.tsx`:
  - Chuyển sang `useFocusEffect` tự động cập nhật khi chuyển tab.
  - Bổ sung helper icon thiết bị trực quan (`getDeviceIcon`).
  - Thẻ đơn hiển thị: Mã phiếu `#RO-...`, Icon & Tên thiết bị, Hãng/Model, Hộp mô tả sự cố lỗi báo, Hộp KTV phụ trách (`🔧`), Địa chỉ sửa chữa (`📍`), Thời gian hẹn (`⏰`), Khối nổi bật màu cam khi có báo giá chờ duyệt (`⚡ BÁO GIÁ ĐÃ SẴN SÀNG!`), Cảnh báo đỏ khi đơn bị từ chối (`❌ Lý do từ chối`), Tổng chi phí dự kiến, Nút đặt lịch mới tại thanh tóm tắt và màn hình rỗng.
- `mobile/src/screens/customer/CreateBookingScreen.tsx`:
  - Nén ảnh `quality: 0.2` chống timeout 413, tự động điền SĐT từ profile, nạp sẵn danh mục thiết bị, reset form sau khi tạo đơn thành công.
- `mobile/src/screens/technician/WorkOrderListScreen.tsx`:
  - Chuyển sang `useFocusEffect`.
  - Thẻ công việc hiển thị: Tên khách hàng kèm nút gọi điện thoại 1-click (`📞 tel:phone`), Tên thiết bị + Hãng/Model, Hộp sự cố báo lỗi, Địa chỉ tận nơi (`📍`), Lịch hẹn (`⏰`), Ngày nhận phiếu, Nút mở chi tiết phiếu.
- `mobile/src/screens/receptionist/ReceptionistDashboardScreen.tsx`:
  - Chuyển sang `useFocusEffect` nạp dữ liệu theo `repairStatus`.
  - Thẻ tiếp nhận hiển thị: Tên khách hàng & nút gọi 1-click, Thiết bị, Hộp lỗi hỏng, Địa chỉ, Lịch hẹn khách yêu cầu, Nút Tiếp nhận / Từ chối / Phân công KTV.
- `mobile/src/screens/accountant/AccountantDashboardScreen.tsx`:
  - Chuyển sang `useFocusEffect`.
  - Thẻ thu tiền hiển thị: Mã phiếu `#RO-...`, Khách hàng kèm nút gọi điện thoại 1-click, Thiết bị + Hãng/Model, Hộp sự cố lỗi hỏng, Địa chỉ sửa chữa, KTV phụ trách, Bảng tóm tắt tài chính (Tổng chi phí, Đã thu, Còn nợ nổi bật đỏ/xanh), Nút Thu tiền kèm số nợ hoặc Nút Bàn giao máy cho khách.

## 3. Kiểm thử & Nghiệm thu
- Mobile TypeScript check: `cd mobile; npx tsc --noEmit` ➔ **PASS 100% (0 errors)**.
- Backend Unit Tests: `cd backend; npm test` ➔ **63/63 tests PASS**.
- Full Integration & E2E Suite: `cd backend; npm run test:all` ➔ **Tất cả 8 test suites PASS 100%**.
- Tự động sinh tài liệu: `npm run docs:generate` ➔ **Đã xuất FULL_PROJECT_DOCUMENTATION.md & HTML**.
