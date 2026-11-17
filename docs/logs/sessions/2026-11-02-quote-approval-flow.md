# Session Log: 2026-11-02 Quy trình Báo giá và Khách hàng phê duyệt trước khi sửa chữa

## Bối cảnh & Yêu cầu
- **Yêu cầu người dùng**: *"sửa lại flow dự án sau. báo giá xong khách chấp nhận thì mới sửa"*
- **Mục tiêu nghiệp vụ**:
  1. Siết chặt quy trình sửa chữa: Sau khi lễ tân tiếp nhận (`RECEIVED`) và phân công KTV (`ASSIGNED`), KTV thực hiện chẩn đoán và lập báo giá chi tiết (công thợ, linh kiện thay thế).
  2. Khi tạo báo giá, phiếu sửa chữa tự động chuyển trạng thái sang `WAITING_APPROVAL`.
  3. Bắt buộc: Kỹ thuật viên KHÔNG ĐƯỢC PHÉP bắt đầu sửa chữa (`IN_PROGRESS` hoặc `REPAIRING`) nếu phiếu chưa có báo giá ở trạng thái đã duyệt (`APPROVED`). Cố tình chuyển trạng thái khi chưa có báo giá duyệt sẽ bị chặn với mã lỗi `409 APPROVED_QUOTE_REQUIRED`.
  4. Khách hàng có thể xem chi tiết báo giá và bấm duyệt ("✅ Đồng ý báo giá này") hoặc từ chối trực tuyến ngay trên Cổng Khách Hàng (`/portal`).
  5. Lễ tân hoặc KTV cũng có thể ghi nhận quyết định duyệt của khách hàng tại tab Báo giá.
  6. Khi báo giá được duyệt (`APPROVED`), đơn sửa chữa tự động chuyển sang trạng thái `APPROVED`. Lúc này, KTV mới được kích hoạt nút "Bắt đầu sửa chữa" (`IN_PROGRESS`).

---

## Chi tiết các thay đổi

### 1. Backend Core & State Machine
- `backend/src/lib/repair-state-machine.js`:
  - `ASSIGNED` chỉ cho phép chuyển sang `DIAGNOSING`, `WAITING_APPROVAL`, `RECEIVED`, `CANCELLED` (chặn không cho nhảy cóc sang `IN_PROGRESS`).
  - `DIAGNOSING` cho phép chuyển sang `WAITING_APPROVAL`, `APPROVED`, `UNREPAIRABLE`, `CANCELLED`.
  - `WAITING_APPROVAL` chuyển sang `APPROVED`, `DIAGNOSING`, `CANCELLED`, `UNREPAIRABLE`.
  - `APPROVED` là trạng thái DUY NHẤT trước sửa chữa có thể chuyển sang `IN_PROGRESS` hoặc `REPAIRING`.
- `backend/src/services/repair-order-service.js`:
  - Bổ sung kiểm tra nghiêm ngặt tại `transition`: Khi chuyển sang `REPAIRING` hoặc `IN_PROGRESS`, truy vấn kiểm tra `SELECT id FROM quotes WHERE repair_order_id = ? AND status = 'APPROVED' LIMIT 1`. Nếu không tìm thấy, ném lỗi `409 APPROVED_QUOTE_REQUIRED: Phải có báo giá được khách hàng chấp thuận (APPROVED) trước khi tiến hành sửa chữa`.
- `backend/src/services/workflow-service.js`:
  - Trong `createQuote`: Khi tạo báo giá mới, tự động cập nhật trạng thái phiếu `repair_orders.repair_status = 'WAITING_APPROVAL'` và ghi lịch sử thay đổi trạng thái.
  - Trong `decide`:
    - Phân quyền: Cho phép Khách hàng sở hữu đơn, Lễ tân (`intake.manage` / `RECEPTIONIST`), KTV phân công, Admin và Quản lý vận hành thực hiện ghi nhận quyết định.
    - Khi `decision === 'APPROVED'`: Tự động cập nhật `quotes.status = 'APPROVED'`, đồng bộ snapshot chi phí vào `repair_orders` (`labor_total`, `parts_total`, `discount_total`, `tax_total`), đồng thời tự động cập nhật `repair_orders.repair_status = 'APPROVED'`.
    - Khi `decision === 'REJECTED'`: Ghi nhận trạng thái báo giá `REJECTED` kèm lý do từ chối.
- `backend/src/routes/repair-orders.js`:
  - Mở rộng middleware phân quyền cho `POST /api/v1/repair-orders/:id/quotes/:quoteId/decisions` dùng `canDecideQuote` để Lễ tân, Admin, Manager và KTV đều có thể ghi nhận quyết định của khách hàng.
- `backend/src/services/customer-portal-service.js`:
  - Cập nhật `getCustomerOrderDetail`: Truy vấn kèm danh sách báo giá (`quotes`) và chi tiết từng hạng mục (`quote_items`) để trả về cho khách xem trên Portal.
- `backend/src/routes/customer-portal.js`:
  - Thêm endpoint `POST /api/v1/customer/orders/:id/quotes/:quoteId/decide` cho phép khách hàng duyệt hoặc từ chối báo giá trực tuyến bằng tài khoản khách hàng.

### 2. Frontend
- `frontend/src/api/customer-portal.js`:
  - Thêm hàm `decideCustomerQuote(orderId, quoteId, payload)` gọi `POST /api/v1/customer/orders/:id/quotes/:quoteId/decide`.
- `frontend/src/pages/CustomerPortalPage.jsx`:
  - Hiển thị khối Báo giá (`quotes-section`) nổi bật trong chi tiết đơn hàng:
    - Bảng chi tiết từng hạng mục (Công thợ, Linh kiện, Số lượng, Đơn giá, Thành tiền).
    - Tổng chi phí báo giá (Công + Linh kiện - Giảm giá).
    - Khi báo giá ở trạng thái `PENDING_CUSTOMER`: Hiển thị cảnh báo màu vàng kèm nút **"✅ Đồng ý báo giá này"** và **"❌ Từ chối"**.
    - Modal ghi nhận lý do khi khách bấm từ chối.
    - Thông báo xác nhận thành công và tự động tải lại chi tiết đơn hàng.
- `frontend/src/pages/RepairDetailPage.jsx`:
  - Điều chỉnh thanh hành động (`status-actions`) chuẩn theo luồng mới:
    - `RECEIVED`: Nút phân công KTV và Chẩn đoán lỗi.
    - `ASSIGNED`: Nút "📋 Lập báo giá gửi khách hàng", "🔬 Chẩn đoán lỗi" kèm cảnh báo "⚠️ Báo giá xong khách chấp nhận thì mới sửa" (ẩn nút bắt đầu sửa vì chưa có báo giá).
    - `DIAGNOSING`: Nút "📋 Lập báo giá gửi khách hàng".
    - `WAITING_APPROVAL`: Huy hiệu cảnh báo "⏳ Đang chờ khách hàng duyệt báo giá" và nút "📋 Xem báo giá & Ghi nhận duyệt".
    - `APPROVED`: Huy hiệu "✅ Khách hàng đã chấp thuận báo giá" và nút kích hoạt "▶ Bắt đầu sửa chữa (IN_PROGRESS)".

---

## Kết quả kiểm thử
1. **Unit & Integration Tests**:
   - Chạy `cd backend; npm test`: **58/58 tests PASS** (100%).
   - Bổ sung test case ma trận chuyển đổi: kiểm tra chặn `ASSIGNED -> IN_PROGRESS` ném lỗi `INVALID_STATUS_TRANSITION`.
2. **Frontend Build & Lint**:
   - `cd frontend; npm run build`: **PASS** (1.10s, 0 lỗi).
   - `cd frontend; npm run lint`: **0 lỗi**.
3. **E2E Scenario Test (Runtime thực tế trên Database MySQL)**:
   - Khách tạo đơn trực tuyến -> `PENDING_RECEPTION`.
   - Lễ tân xác nhận tiếp nhận -> `RECEIVED`.
   - Phân công KTV -> `ASSIGNED`.
   - Cố tình chuyển `IN_PROGRESS` trước khi có báo giá duyệt -> BỊ CHẶN 409 (`APPROVED_QUOTE_REQUIRED`).
   - KTV lập báo giá -> đơn tự động chuyển `WAITING_APPROVAL`.
   - Khách xem đơn trên Portal: thấy báo giá và hạng mục linh kiện/công thợ.
   - Khách bấm duyệt báo giá qua Portal -> Báo giá chuyển `APPROVED`, đơn tự động chuyển `APPROVED`.
   - KTV/Lễ tân chuyển đơn sang `IN_PROGRESS` -> THÀNH CÔNG!

