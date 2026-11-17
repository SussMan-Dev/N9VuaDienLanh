# Session Log: Bỏ bước chẩn đoán trên Mobile & Tối ưu giao diện trực quan bắt mắt (2026-11-15)

## 1. Yêu cầu người dùng
1. Bỏ bước chẩn đoán trên Mobile để tối giản quy trình cho Kỹ thuật viên (từ khi nhận đơn phân công có thể trực tiếp lập báo giá).
2. Tối ưu lại toàn bộ giao diện Mobile bắt mắt, hiện đại, dễ thao tác và hiển thị thông tin rõ ràng.

## 2. Công việc đã thực hiện

### 2.1. Loại bỏ bước chẩn đoán trung gian trên Mobile
- **Màn hình Chi tiết phiếu KTV (`WorkOrderDetailScreen.tsx`)**:
  - Loại bỏ nút trung gian `🔍 Bắt đầu chẩn đoán thiết bị` và trạng thái `DIAGNOSING`.
  - Khi đơn hàng ở trạng thái `ASSIGNED` (hoặc `DIAGNOSING`), Kỹ thuật viên được cung cấp trực tiếp nút nổi bật: **`📝 Lập Báo Giá Gửi Admin Duyệt`** để mở ngay màn hình soạn báo giá (`QuoteBuilderScreen`).
  - Khi KTV hoàn thành báo giá, đơn tự động chuyển sang `AWAITING_ADMIN_APPROVAL` để Quản trị viên duyệt tầng 1.
  - Loại bỏ hoàn toàn các hook/state không cần thiết liên quan đến `listDiagnostics`.
- **Màn hình Nhật ký & Ảnh thực tế (`CameraLogScreen.tsx`)**:
  - Thay đổi nhãn "Chi tiết chẩn đoán phát sinh" thành "Ghi chú kỹ thuật bổ sung (nếu có)".
- **Từ điển trạng thái (`repairStatus.ts`)**:
  - Cập nhật nhãn trạng thái `DIAGNOSING` thành `Đang xử lý báo giá`.

### 2.2. Tối ưu lại giao diện Mobile trực quan & bắt mắt
- **Thanh tiến trình 4 giai đoạn trực quan (Progress Stepper)** trên `WorkOrderDetailScreen`:
  - 4 cột mốc nghiệp vụ: `1. Phân công` ➔ `2. Báo giá` ➔ `3. Sửa chữa` ➔ `4. Nghiệm thu`.
  - Thiết kế vòng tròn số thứ tự có viền phát sáng, dấu tích `✓` xanh lá cho các bước đã hoàn tất và tô xanh dương cho bước hiện tại.
- **Thẻ thông tin Thiết bị nổi bật**:
  - Icon thiết bị phóng to nhận diện tức thì (`❄️ Điều hòa`, `🧺 Máy giặt`, `🧊 Tủ lạnh`, `🔥 Bếp từ`...).
  - Mã phiếu `#RO-...` in đậm to rõ ràng kèm ngày tiếp nhận.
  - Hộp cảnh báo hiện tượng lỗi ban đầu nổi bật với viền cam và nền vàng ấm.
- **Thẻ Khách hàng & Tác vụ nhanh**:
  - Hai nút bấm lớn nổi bật với màu sắc gradient:
    - `📞 Gọi cho khách` (Xanh lá ngọc lục bảo `#10b981`)
    - `🗺️ Chỉ đường Maps` (Xanh dương bầu trời `#0284c7`)
- **Khối Thao Tác Quy Trình (Workflow Card)**:
  - Thiết kế viền xanh nổi bật (`elevation: 3`, bo góc `16px`).
  - Hộp cảnh báo trạng thái đồng bộ:
    - Màu vàng hổ phách khi chờ Admin duyệt (`AWAITING_ADMIN_APPROVAL`).
    - Màu cam khi chờ khách duyệt trực tuyến (`AWAITING_CUSTOMER_APPROVAL`).
    - Màu xanh lá khi khách đã duyệt để bấm `Khách Đã Duyệt — Bắt Đầu Sửa Chữa`.
- **Lịch sử Báo giá & Thư viện ảnh đối chiếu**:
  - Thẻ tóm tắt các phiên bản báo giá kèm tổng tiền định dạng VNĐ nổi bật.
  - Thư viện ảnh trước và sau khi sửa chữa hiển thị theo thanh cuộn ngang mượt mà.

## 3. Kiểm thử & Nghiệm thu
- Mobile TypeScript: `cd mobile && npx tsc --noEmit` ➔ **0 lỗi (PASS 100%)**.
- Backend Unit Tests: `cd backend && npm test` ➔ **63/63 PASS**.
- Full Test Suite: `cd backend && npm run test:all` ➔ **8 test suites PASS 100%**.
- Tự động sinh tài liệu: `npm run docs:generate` hoàn tất.
