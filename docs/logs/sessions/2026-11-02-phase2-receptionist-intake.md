# Session Log: 2026-11-02 Phase 2 — Lễ tân Tiếp nhận & Từ chối Ticket (Giai đoạn 1 & 2)

## 1. Yêu cầu nghiệp vụ
- **Giai đoạn 1: Tạo yêu cầu sửa chữa**:
  - Khách hàng tự tạo hoặc Lễ tân tạo hộ.
  - Cung cấp: Thông tin liên hệ, địa chỉ, loại thiết bị, thương hiệu, model, mô tả hư hỏng, hình ảnh.
  - Ticket được tạo ở trạng thái `PENDING`.
- **Giai đoạn 2: Lễ tân tiếp nhận**:
  - Lễ tân kiểm tra thông tin Ticket mới.
  - Có 2 trường hợp:
    - **Chấp nhận**: Ticket chuyển sang `ACCEPTED`, chờ Admin phân công (GĐ 3).
    - **Từ chối**: Ticket chuyển sang `REJECTED`, **bắt buộc ghi rõ lý do** từ chối và thông báo cho khách hàng.

---

## 2. Chi tiết triển khai

### Backend
1. `backend/src/services/customer-portal-service.js`:
   - `createServiceRequest`: Chuyển trạng thái khởi tạo phiếu sang `PENDING`.
   - `listCustomerOrders`: Hỗ trợ lọc trạng thái `PENDING` (bao gồm cả `PENDING_RECEPTION`) và `ACCEPTED` (bao gồm cả `RECEIVED`).
   - `getCustomerOrderDetail`: Bổ sung trường `rejectionReason` trả về cho khách hàng tra cứu.
2. `backend/src/services/repair-order-service.js`:
   - Cập nhật hàm `map(row)`: Bổ sung trường `rejectionReason` và `paidAt`.
   - Trong `list`: Hỗ trợ lọc đa trạng thái tương thích `PENDING` và `ACCEPTED`.
   - Trong `transition`: Bắt buộc kiểm tra `reason` khi `toStatus === 'REJECTED'`; lưu `rejection_reason` vào bảng `repair_orders` và cập nhật `service_requests.status = 'CANCELLED'`.

### Frontend
1. `frontend/src/pages/RepairsListPage.jsx`:
   - Cập nhật thanh tab lọc trạng thái chuẩn 10 giai đoạn:
     - Tất cả phiếu
     - 🔔 Chờ tiếp nhận (GĐ 1)
     - 📥 Đã tiếp nhận (GĐ 2)
     - 👔 Đã phân công (GĐ 3)
     - ⚖️ Chờ Admin duyệt giá (GĐ 5)
     - ⏳ Chờ khách duyệt giá (GĐ 6)
     - 🔧 Đang sửa chữa (GĐ 7)
     - 📦 Chờ linh kiện (GĐ 8)
     - ✅ Hoàn thành sửa (GĐ 9)
     - 💳 Đã thanh toán (GĐ 10)
     - ❌ Đã từ chối
   - Khi dòng Ticket ở trạng thái chờ tiếp nhận (`isPending`) và nhân viên có quyền `intake.manage`:
     - Nút **"✅ Chấp nhận"**: Gọi `transitionStatus(id, { toStatus: 'ACCEPTED' })`.
     - Nút **"❌ Từ chối"**: Bật Modal chuyên biệt bắt buộc nhập lý do từ chối.
   - Modal Từ chối tiếp nhận: Kiểm tra lý do không được để trống, gọi API `toStatus: 'REJECTED'` và thông báo phản hồi.
2. `frontend/src/pages/RepairDetailPage.jsx`:
   - Khi Ticket ở trạng thái `PENDING`: Hiển thị 2 nút: "✅ Lễ tân chấp nhận đơn (ACCEPTED)" và "❌ Từ chối đơn (REJECTED)" (mở modal nhập lý do).
   - Khi Ticket ở trạng thái `ACCEPTED`: Hiển thị thông báo "📥 Đơn đã tiếp nhận — Chờ Admin phân công Kỹ thuật viên (GĐ 3)" và nút "👔 Phân công Kỹ thuật viên".
   - Khi Ticket ở trạng thái `REJECTED`: Đưa vào `isTerminal` và hiển thị banner cảnh báo màu đỏ nổi bật kèm lý do từ chối.
3. `frontend/src/pages/CustomerPortalPage.jsx`:
   - Hiển thị banner thông báo màu đỏ cho khách hàng khi đơn bị từ chối tiếp nhận: "❌ Yêu cầu sửa chữa của quý khách đã bị từ chối tiếp nhận. Lý do: ...".

---

## 3. Kết quả kiểm thử & Nghiệm thu
1. **Unit Tests**:
   - `cd backend; npm test`: **62/62 tests PASS (100%)**.
2. **Frontend Build**:
   - `cd frontend; npm run build`: **PASS** trong 220ms (0 lỗi).
3. **Runtime Integration Test**:
   - Khách tạo đơn trực tuyến ➔ Ticket khởi tạo ở `PENDING`.
   - Lễ tân gửi yêu cầu `REJECTED` không có lý do ➔ Bị hệ thống chặn ngay với mã lỗi `422 TRANSITION_REASON_REQUIRED`.
   - Lễ tân gửi yêu cầu `REJECTED` kèm lý do ➔ Thành công, trạng thái chuyển sang `REJECTED`, lý do được lưu vào database.
   - Khách tạo Ticket tiếp theo ➔ `PENDING`.
   - Lễ tân bấm Chấp nhận ➔ Trạng thái chuyển sang `ACCEPTED`, hiển thị trong danh sách chờ Admin phân công.

