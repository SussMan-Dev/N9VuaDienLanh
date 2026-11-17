# Session Log: 2026-11-01 — TASK-N03 (Parts Request API)

## Bối cảnh & Mục tiêu
- **Mục tiêu**: Xây dựng toàn bộ API và nghiệp vụ luồng cấp phát linh kiện từ kho cho phiếu sửa chữa (`parts_requests` & `parts_request_items`):
  1. KTV yêu cầu cấp phát linh kiện kèm lý do, ghi chú và số lượng cần dùng.
  2. Quản lý kho duyệt hoặc từ chối có lý do.
  3. Quản lý kho thực hiện xuất kho nguyên tử: kiểm tra tồn kho bằng `SELECT ... FOR UPDATE`, trừ tồn kho trong `inventory_stocks`, ghi sổ giao dịch `ISSUE`, tự động ghi nhận vào `repair_order_parts`, snapshot đơn giá vốn/giá bán, tính lại `parts_total` trên phiếu sửa chữa, và tự động chuyển trạng thái phiếu từ `WAITING_PARTS` về `REPAIRING`.

## Các thay đổi đã thực hiện
1. **Service (`backend/src/services/parts-request-service.js`)**:
   - `listPartsRequests`: Danh sách yêu cầu cấp phát kèm chi tiết linh kiện, phân quyền theo vai trò (KTV chỉ xem yêu cầu của mình, Quản lý kho/Admin xem toàn bộ).
   - `getPartsRequest`: Chi tiết yêu cầu và danh mục linh kiện liên quan.
   - `createPartsRequest`: Tạo yêu cầu mới, sinh mã `PR-YYYYMMDD-XXXX`, tự động chuyển phiếu sửa chữa sang `WAITING_PARTS` nếu đang sửa chữa.
   - `approvePartsRequest`: Quản lý kho duyệt yêu cầu (hỗ trợ điều chỉnh `quantity_approved`).
   - `rejectPartsRequest`: Quản lý kho từ chối yêu cầu kèm lý do bắt buộc.
   - `issuePartsRequest`: Xuất kho nguyên tử an toàn trong transaction, kiểm tra tồn kho từng mặt hàng, trừ kho, tạo giao dịch kho `ISSUE`, bổ sung `repair_order_parts`, cập nhật `parts_total` trên phiếu và chuyển trạng thái phiếu về `REPAIRING`.
   - `cancelPartsRequest`: KTV hoặc Quản lý kho hủy yêu cầu.
2. **Routes (`backend/src/routes/parts-requests.js`)**:
   - `GET /api/v1/parts-requests`
   - `POST /api/v1/parts-requests`
   - `GET /api/v1/parts-requests/:id`
   - `PATCH /api/v1/parts-requests/:id/approve`
   - `PATCH /api/v1/parts-requests/:id/reject`
   - `POST /api/v1/parts-requests/:id/issue`
   - `PATCH /api/v1/parts-requests/:id/cancel`
3. **Tích hợp (`backend/src/app.js` & `backend/package.json`)**:
   - Mount router tại `/api/v1/parts-requests`.
   - Cập nhật kịch bản kiểm tra cú pháp `npm run lint`.
4. **Kiểm thử tự động (`backend/test/parts-requests.test.js`)**:
   - Bổ sung 5 kiểm thử validation số lượng, danh sách mặt hàng, định dạng ID và trạng thái hợp lệ.

## Kết quả kiểm thử
- `cd backend && npm run lint`: PASS (0 lỗi).
- `cd backend && npm test`: 44/44 tests PASS.

