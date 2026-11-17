# Session Log: 2026-11-02 Phase 3 — Quy trình 2 tầng duyệt Báo giá Admin ➔ Khách hàng (Giai đoạn 3, 4, 5, 6)

## 1. Yêu cầu nghiệp vụ & Mục tiêu
- **Giai đoạn 3 (Admin phân công Kỹ thuật viên)**:
  - Admin chọn Ticket `ACCEPTED` (hoặc `RECEIVED`), phân công KTV phù hợp.
  - Ticket tự động chuyển sang `ASSIGNED`.
- **Giai đoạn 4 (KTV chẩn đoán & lập báo giá)**:
  - KTV kiểm tra thiết bị, ghi nhận chẩn đoán và tạo báo giá gồm chi phí nhân công + linh kiện.
  - Sau khi lập báo giá, Ticket tự động chuyển sang `AWAITING_ADMIN_APPROVAL`.
  - Cột `quotes.admin_approval_status` khởi tạo là `'PENDING'`.
- **Giai đoạn 5 (Admin duyệt chẩn đoán & báo giá)**:
  - Chỉ Admin hoặc Quản trị viên (`operations.manage`, `system.manage`, role `ADMIN`) mới có quyền thẩm định báo giá.
  - Quyết định `APPROVED`:
    - `quotes.admin_approval_status = 'APPROVED'`, lưu `admin_approved_by_user_id` và thời gian duyệt `admin_approved_at`.
    - Ticket chuyển sang `AWAITING_CUSTOMER_APPROVAL`, gửi cho khách hàng.
  - Quyết định `REJECTED`:
    - `quotes.admin_approval_status = 'REJECTED'`, lưu lý do yêu cầu sửa vào `quotes.admin_reject_note`.
    - Ticket quay trở về `ASSIGNED` để KTV lập báo giá mới hoặc điều chỉnh lại phương án/chi phí.
- **Giai đoạn 6 (Khách hàng xác nhận báo giá)**:
  - Khách hàng xem báo giá trên Cổng Khách Hàng (`/portal`) hoặc Lễ tân ghi nhận qua điện thoại.
  - **Ràng buộc an toàn cốt lõi**: Khách hàng hoặc Lễ tân KHÔNG THỂ phê duyệt báo giá nếu báo giá đó chưa được Admin duyệt (`quotes.admin_approval_status !== 'APPROVED'`). Hệ thống chặn ngay lập tức với mã lỗi `409 ADMIN_APPROVAL_REQUIRED`.
  - Quyết định `APPROVED`:
    - Quote thành `APPROVED`, snapshot chi phí vào `repair_orders` (`labor_total`, `parts_total`...).
    - Ticket chuyển sang `APPROVED`.
    - Chỉ sau khi khách hàng đồng ý, KTV mới được bấm `IN_PROGRESS` để bắt đầu sửa chữa.
  - Quyết định `REJECTED`:
    - Quote thành `REJECTED`, Ticket chuyển sang `CANCELLED`.

---

## 2. Chi tiết triển khai

### Backend
1. `backend/src/services/workflow-service.js`:
   - `assign`: Hỗ trợ chuyển trạng thái từ `ACCEPTED` hoặc `RECEIVED` sang `ASSIGNED`.
   - `listQuotes` & `getQuote`: Truy vấn thêm `adminApprovalStatus`, `adminApprovedByUserId`, `adminApprovedByName`, `adminApprovedAt`, `adminRejectNote`, `isSupplemental` (LEFT JOIN với bảng `users`).
   - `quote`: Tạo báo giá với `admin_approval_status = 'PENDING'`, tự động cập nhật đơn sang `AWAITING_ADMIN_APPROVAL` và ghi log lịch sử trạng thái.
   - Viết method mới `adminDecideQuote(id, quoteId, body, auth)`:
     - Kiểm tra quyền Quản trị viên (`ADMIN`, `MANAGER`, `operations.manage`, `system.manage`).
     - Hỗ trợ 2 quyết định: `APPROVED` (chuyển sang `AWAITING_CUSTOMER_APPROVAL`) và `REJECTED` (chuyển về `ASSIGNED` kèm `admin_reject_note`).
   - Cập nhật method `decide(id, quoteId, body, auth)`:
     - Thêm điều kiện kiểm tra bắt buộc: `if (quote.admin_approval_status !== 'APPROVED') throw new AppError(409, 'ADMIN_APPROVAL_REQUIRED', ...)`.
     - Khi khách hàng chấp thuận: chuyển `repair_orders.repair_status = 'APPROVED'`.
     - Khi khách hàng từ chối: chuyển `repair_orders.repair_status = 'CANCELLED'`.
2. `backend/src/routes/repair-orders.js`:
   - Thêm middleware `adminOrOps` kiểm tra quyền quản trị.
   - Thêm route: `POST /api/v1/repair-orders/:id/quotes/:quoteId/admin-approval`.
3. `backend/src/services/repair-order-service.js`:
   - Bổ sung quyền chuyển trạng thái cho Lễ tân khi xử lý từ `PENDING` sang `ACCEPTED`/`REJECTED`/`CANCELLED`.
4. `backend/src/services/customer-portal-service.js`:
   - Truy vấn và trả về các trường `adminApprovalStatus`, `adminRejectNote` cho Cổng Khách Hàng.

### Frontend
1. `frontend/src/api/repairs.js`:
   - Bổ sung export hàm `adminDecideQuote(id, quoteId, payload)` gọi endpoint `POST /api/v1/repair-orders/:id/quotes/:quoteId/admin-approval`.
2. `frontend/src/utils/formatters.js`:
   - Mở rộng `QUOTE_STATUS_MAP` hỗ trợ `PENDING_CUSTOMER` và `SUPERSEDED`.
3. `frontend/src/pages/RepairDetailPage.jsx`:
   - Workflow Action Bar:
     - Khi `order.repairStatus === 'AWAITING_ADMIN_APPROVAL'`: Hiển thị badge vàng "⚖️ GĐ 5: Báo giá đang chờ Admin thẩm định & phê duyệt" và nút xem báo giá.
     - Khi `order.repairStatus === 'AWAITING_CUSTOMER_APPROVAL'`: Hiển thị badge xanh "⏳ GĐ 6: Admin đã duyệt — Đang chờ khách hàng xác nhận".
     - Khi `order.repairStatus === 'APPROVED'`: Hiển thị badge "✅ Khách hàng đã chấp thuận báo giá" và mở nút `▶ Bắt đầu sửa chữa (IN_PROGRESS)`.
   - Tab Quotes:
     - Hiển thị badge trạng thái thẩm định Admin: `✅ Admin đã duyệt (Tên Admin)`, `❌ Admin yêu cầu sửa: ...`, `⏳ Chờ Admin thẩm định (GĐ 5)`.
     - Hộp công cụ Admin thẩm định: Khi `adminApprovalStatus === 'PENDING'` và người dùng là Admin/Manager, hiển thị 2 nút: "✅ Duyệt báo giá (Gửi khách hàng)" và "↩️ Yêu cầu KTV sửa lại".
     - Hộp quyết định của khách hàng: Bị khóa nếu Admin chưa duyệt kèm thông báo cảnh báo; chỉ mở khi `adminApprovalStatus === 'APPROVED'`.
   - Thêm Modal `showAdminDecisionModal` cho Quản trị viên nhập ghi chú thẩm định hoặc lý do yêu cầu sửa đổi.
4. `frontend/src/pages/CustomerPortalPage.jsx`:
   - Khi báo giá đang ở `adminApprovalStatus === 'PENDING'`: Hiển thị thông báo màu xanh dương "⏳ ĐANG THẨM ĐỊNH BÁO GIÁ (GIAI ĐOẠN 5): Kỹ thuật viên đã lập dự toán, Quản lý trung tâm đang thẩm định phương án và chi phí trước khi gửi quý khách phê duyệt." (Ẩn 2 nút duyệt/từ chối).
   - Khi báo giá bị Admin từ chối (`adminApprovalStatus === 'REJECTED'`): Hiển thị thông báo "↩️ ĐANG ĐIỀU CHỈNH BÁO GIÁ".
   - Khi báo giá đã được Admin duyệt (`adminApprovalStatus === 'APPROVED'`): Hiển thị banner màu vàng "⚠️ BÁO GIÁ ĐANG CHỜ QUÝ KHÁCH PHÊ DUYỆT" kèm 2 nút "✅ Đồng ý báo giá này" và "❌ Từ chối".

---

## 3. Kết quả kiểm thử & Nghiệm thu
1. **Unit Tests Backend**:
   - Chạy `npm test`: **63/63 tests PASS (100%)** (đã bổ sung test case cho logic 2 tầng phê duyệt báo giá).
2. **Frontend Build**:
   - Chạy `npm run build`: **PASS** trong 219ms (0 lỗi, 0 cảnh báo).
3. **Integration Test Runtime E2E (11 bước)**:
   - Bước 1: Login 4 role Customer, Admin, Receptionist, Technician thành công.
   - Bước 2: Khách hàng tạo yêu cầu trực tuyến ➔ `PENDING`.
   - Bước 3: Lễ tân tiếp nhận đơn ➔ `ACCEPTED`.
   - Bước 4: Admin phân công KTV Tuấn ➔ `ASSIGNED`.
   - Bước 5: KTV lập báo giá v1 ➔ Ticket sang `AWAITING_ADMIN_APPROVAL`, `quotes.admin_approval_status = 'PENDING'`.
   - Bước 6: Khách hàng cố tình duyệt trước khi Admin duyệt ➔ Bị hệ thống chặn ngay với HTTP `409 ADMIN_APPROVAL_REQUIRED`.
   - Bước 7: Admin từ chối báo giá v1 với ghi chú "Giá block máy nén 1.200.000đ hơi cao, trung tâm có nguồn 950.000đ" ➔ Báo giá v1 chuyển `REJECTED`, đơn chuyển về `ASSIGNED`.
   - Bước 8: KTV lập báo giá v2 với giá mới 950k ➔ Ticket chuyển sang `AWAITING_ADMIN_APPROVAL`.
   - Bước 9: Admin phê duyệt báo giá v2 ➔ Quote v2 chuyển `APPROVED`, đơn chuyển sang `AWAITING_CUSTOMER_APPROVAL`.
   - Bước 10: Khách hàng xem trên Portal và bấm Đồng ý ➔ Quote v2 được chấp thuận, đơn chuyển sang `APPROVED`, snapshot chi phí thành công.
   - Bước 11: KTV bấm "▶ Bắt đầu sửa chữa" ➔ Đơn chuyển sang `IN_PROGRESS` thành công.

