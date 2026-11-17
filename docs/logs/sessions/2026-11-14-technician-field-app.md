# Session Log — Triển khai Giai đoạn 2: App Kỹ thuật viên Hiện trường (TASK-M02)

**Ngày**: 2026-11-14  
**Mục tiêu**: Xây dựng toàn bộ các màn hình và tính năng dành cho Kỹ thuật viên (Field Tech) trên Mobile App theo đúng đặc tả Giai đoạn 2 trong lộ trình: nhận việc, liên hệ khách, dẫn đường, chẩn đoán, chụp ảnh trước/sau sửa chữa, lập báo giá & báo giá bổ sung, yêu cầu linh kiện kho.

## 1. Việc đã thực hiện

### A. Cài đặt Thư viện & Cấu hình
1. **Cài đặt `expo-image-picker`**:
   - Tương thích Expo SDK 58.
   - Hỗ trợ chụp ảnh trực tiếp từ Camera và chọn ảnh từ Thư viện đa phương tiện.
   - Cơ chế nén ảnh tự động (quality 0.6) và chuyển đổi Base64/URI.

### B. Mở rộng Tầng API (`mobile/src/api/`)
1. **`repairs.ts`**: Bổ sung `createDiagnostic`, `listDiagnostics`, `createQuote` (hỗ trợ cả báo giá chuẩn và báo giá bổ sung `isSupplemental`).
2. **`inventory.ts`**: Bổ sung `listInventoryItems`, `getInventoryItem` tra cứu danh mục và tồn kho.
3. **`parts-requests.ts`**: Bổ sung `createPartsRequest`, `listPartsRequests` tạo yêu cầu cấp phát linh kiện gửi Thủ kho.

### C. Xây dựng Màn hình Chuyên biệt KTV (`mobile/src/screens/technician/`)
1. **`WorkOrderDetailScreen.tsx`**:
   - Thẻ thông tin máy, số serial, mô tả lỗi ban đầu từ khách hàng.
   - **Nút 1-chạm**: Gọi điện trực tiếp cho khách (`Linking.openURL('tel:...')`) và Mở bản đồ Google Maps chỉ đường đến nhà khách (`Linking.openURL('https://maps.google.com/...')`).
   - **Thanh hành động chuyển trạng thái linh hoạt**:
     * `ASSIGNED` ➔ Bấm "Bắt đầu chẩn đoán" (GĐ 4).
     * `DIAGNOSING` ➔ Bấm "Lập báo giá gửi Admin duyệt" (GĐ 5).
     * `APPROVED` ➔ Bấm "Khách đã duyệt — Bắt đầu sửa chữa" (GĐ 7).
     * `IN_PROGRESS` ➔ Bấm "Chụp ảnh & Ghi nhật ký", "Yêu cầu linh kiện kho", "Báo giá bổ sung", hoặc "Hoàn thành sửa chữa" (GĐ 9).
   - Danh sách lịch sử báo giá và nhật ký công việc kèm ảnh trước/sau.
2. **`CameraLogScreen.tsx`**:
   - Chụp ảnh hoặc chọn từ thư viện cho 2 nhóm riêng biệt: **"Ảnh Trước Sửa Chữa (Hiện trạng lỗi)"** và **"Ảnh Sau Sửa Chữa (Nghiệm thu)"**.
   - Nhập nội dung công việc đã làm (`workPerformed`) và ghi chú chẩn đoán.
   - Nút lưu dữ liệu gọi API `POST /repair-orders/:id/logs`.
3. **`QuoteBuilderScreen.tsx`**:
   - Nhập tiền công sửa chữa.
   - Chọn nhanh linh kiện từ kho (`listInventoryItems`) hoặc nhập linh kiện ngoài.
   - Tự động tính tổng tiền công + tiền linh kiện = tổng chi phí theo thời gian thực.
   - Hỗ trợ chế độ **"Báo giá bổ sung"** (`isSupplemental: true`) khi tháo máy phát hiện hỏng hóc mới.
   - Gửi báo giá lên hệ thống đưa đơn sang `AWAITING_ADMIN_APPROVAL` (GĐ 5).
4. **`PartsRequestScreen.tsx`**:
   - Chọn linh kiện từ kho, tăng/giảm số lượng cần cấp.
   - Nhập ghi chú cho Thủ kho.
   - Gửi yêu cầu chuyển đơn sang `WAITING_PARTS` (GĐ 8).

### D. Cập nhật Điều hướng (`TechnicianTabs.tsx`)
- Tích hợp Native Stack Navigator bọc ngoài Bottom Tabs: hỗ trợ push/pop mượt mà giữa danh sách đơn và các màn hình chi tiết, chụp ảnh, báo giá, yêu cầu linh kiện.

## 2. Kết quả kiểm thử
- `npx tsc --noEmit` trong thư mục `mobile/`: **0 lỗi biên dịch (100% type-safe)**.
- Backend 63/63 tests PASS.
- Đã cập nhật trạng thái `TASK-M02` thành `DONE` trong `docs/tasks/README.md`.
