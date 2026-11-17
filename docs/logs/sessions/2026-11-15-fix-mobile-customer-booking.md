# Phiên làm việc: 2026-11-15 - Khắc phục Triệt để Lỗi Khách không Lên đơn được trên App Mobile

## Vấn đề phát hiện
1. **Thiếu nút đăng nhập nhanh cho vai trò Khách hàng trên `LoginScreen`**: Chỉ có 5 vai trò nhân viên (`admin`, `ktv_dung`, `letan_mai`, `thukho_an`, `ketoan_hoa`), người dùng thử nghiệm không có tài khoản khách hàng mẫu để đăng nhập trải nghiệm `CustomerTabs`.
2. **Lỗi `normalizeUser` trong `AuthContext`**: API `/api/v1/auth/me` trả về `{ user: { id, username, fullName }, roles, permissions }`, hàm `normalizeUser` truy cập trực tiếp `data.id` thay vì `data.user?.id`.
3. **Màn hình Danh sách Đơn (`CustomerOrderListScreen`) không cập nhật tự động khi chuyển Tab**: Dùng `useEffect(..., [])` chỉ chạy lúc mount lần đầu, dẫn tới sau khi tạo đơn thành công ở tab "Đặt lịch sửa" và quay lại tab "Đơn của tôi", danh sách không tải lại đơn mới (khiến người dùng tưởng chưa lên đơn). Ngoài ra màn hình rỗng thiếu nút đặt lịch trực tiếp.
4. **Khớp nối dữ liệu trường thiết bị & mã phiếu**: Backend trả về `item.device.typeName`, `item.device.brand`, `item.code`, trong khi UI giao diện trước đó đọc trực tiếp `item.deviceType` và `item.orderCode`.
5. **Dung lượng ảnh base64 quá lớn**: Chụp ảnh chất lượng `0.6` tạo base64 nhiều megabyte, dễ gây nghẽn mạng và vượt timeout 10s (`ECONNABORTED`).
6. **Màn hình theo dõi tiến trình (`OrderTrackingScreen`) không bắt được báo giá**: Điều kiện kiểm tra báo giá `q.status === 'AWAITING_CUSTOMER_APPROVAL'` không khớp với trạng thái thực tế `q.status === 'PENDING_CUSTOMER' && q.adminApprovalStatus === 'APPROVED'`.

## Các giải pháp đã triển khai
1. **`LoginScreen.tsx`**:
   - Thêm nút chọn nhanh tài khoản `👤 Khách hàng` (`kh_tuanhm` / `password123`).
   - Cập nhật mật khẩu `password123` cho các tài khoản khách hàng mẫu `kh_tuanhm`, `client`, `khachhang_test`.
2. **`AuthContext.tsx`**:
   - Sửa hàm `normalizeUser` hỗ trợ cả cấu trúc `data.user` và `data`, bổ sung trường `phone`.
3. **`CustomerOrderListScreen.tsx`**:
   - Chuyển sang dùng `useFocusEffect` (từ `@react-navigation/native`), tự động làm mới danh sách đơn mỗi khi chuyển tab vào màn hình.
   - Thêm nút `📅 Đặt Lịch Sửa Chữa Ngay` trực tiếp trên trạng thái danh sách rỗng.
   - Bổ sung thanh công cụ trên cùng hiển thị số lượng phiếu và nút `+ Đặt lịch mới`.
   - Hiển thị đầy đủ thông tin: Mã phiếu (`RO-...`), Loại thiết bị, Hãng/Model, Hiện tượng hỏng, Ngày gửi và Badge trạng thái màu sắc trực quan.
4. **`CreateBookingScreen.tsx`**:
   - Nạp sẵn mảng danh mục thiết bị dự phòng (`DEFAULT_TYPES`) để người dùng luôn có nút bấm ngay lập tức.
   - Tối ưu chất lượng ảnh chụp `quality: 0.2` giúp upload base64 nhẹ, nhanh và mượt mà.
   - Tự động điền số điện thoại của tài khoản đang đăng nhập.
   - Tự động reset form (hiện tượng hỏng, hình ảnh, hãng, model) sau khi gửi thành công.
   - Bổ sung thông báo kèm mã phiếu vừa tạo và chuyển tab xem đơn.
5. **`OrderTrackingScreen.tsx`**:
   - Khắc phục điều kiện nhận diện `pendingQuote` theo quy trình 2 tầng: `(q.status === 'PENDING_CUSTOMER' && q.adminApprovalStatus === 'APPROVED')`.
   - Sử dụng `useFocusEffect` tự động cập nhật tiến trình đơn khi quay lại màn hình.

## Kết quả kiểm chứng
- `mobile`: `npx tsc --noEmit` PASS 100% (0 lỗi).
- `backend`: `npm run test:mobile-e2e` PASS 12/12 bước tích hợp liên thông.
- `backend`: `npm test` PASS 63/63 unit tests.
- `backend`: `npm run lint` PASS 40/40 files.
