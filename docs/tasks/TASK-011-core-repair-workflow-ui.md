# TASK-011 — Core repair workflow UI
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-007, TASK-010

## Mục tiêu
Xây dựng giao diện người dùng cho quản lý khách hàng, thiết bị, danh sách phiếu sửa chữa, tiếp nhận phiếu mới, phân công kỹ thuật viên, chẩn đoán sự cố, lập và phê duyệt báo giá, tiến độ sửa chữa, tích hợp vật tư và thanh toán công nợ.

## Tiêu chí nghiệm thu
- [x] Luồng chính hoạt động end-to-end với API và quyền hiển thị phù hợp.
  - Quản lý Khách hàng & Thiết bị (`CustomersPage.jsx`): Tìm kiếm, danh sách khách hàng, tạo khách hàng, danh sách thiết bị theo khách hàng, thêm thiết bị mới, chuyển nhanh sang tạo phiếu.
  - Danh sách phiếu sửa chữa (`RepairsListPage.jsx`): Lọc theo trạng thái và tìm kiếm từ khóa, hiển thị mã phiếu, khách hàng, thiết bị, KTV phụ trách, trạng thái badge, ngày tiếp nhận và ngày hẹn.
  - Tiếp nhận phiếu sửa chữa (`RepairIntakePage.jsx`): Chọn khách hàng, thiết bị, nhập mô tả lỗi, hiện trạng tiếp nhận, ngày hẹn trả, ghi chú, liên kết bảo hành.
  - Chi tiết phiếu sửa chữa (`RepairDetailPage.jsx`):
    - Header thông tin tổng quan, badge trạng thái, thông tin khách hàng, thiết bị, lỗi tiếp nhận.
    - Thanh điều hướng tiến trình trạng thái tiếp theo hợp lệ (theo state machine: RECEIVED -> DIAGNOSING -> WAITING_APPROVAL -> APPROVED -> REPAIRING -> READY_FOR_PICKUP -> DELIVERED, modal lý do cho CANCELLED / UNREPAIRABLE / override).
    - Tab 1 - Chẩn đoán: Lịch sử biên bản chẩn đoán, form ghi nhận chẩn đoán và ước tính công.
    - Tab 2 - Báo giá: Danh sách các phiên bản báo giá, form tạo báo giá chi tiết từng dòng (vật tư/công), duyệt và từ chối báo giá.
    - Tab 3 - Phân công & Lịch sử: KTV đang phụ trách, modal phân công kỹ thuật viên (dành cho Quản lý), timeline lịch sử chuyển đổi trạng thái phiếu.
    - Tab 4 - Linh kiện & Phụ tùng: Danh sách linh kiện đã dùng, thêm linh kiện, gỡ linh kiện.
    - Tab 5 - Thanh toán & Công nợ: Thẻ thống kê tổng chi phí, đã thanh toán, còn phải thu, danh sách giao dịch thu tiền, form thu tiền, modal hủy giao dịch (Quản lý).
    - Tab 6 - Bảo hành: Thẻ bảo hành đã cấp, form cấp thẻ bảo hành mới, danh sách các ca bảo hành lại liên quan.
  - Tuân thủ quy chuẩn 4 trạng thái: Loading, Empty, Error (kèm Retry) và Success trên mọi màn hình.
  - Phân quyền theo vai trò (`intake.manage`, `repair.manage`, `operations.manage`).

## Kiểm thử & Xác thực
- Backend: Chạy `npm test` đạt 34/34 tests passing. `npm run lint` đạt 0 lỗi.
- Backend API Router: Bổ sung endpoint `GET /api/v1/technicians` và cấu hình phân quyền xem phiếu cho nhân viên tiếp nhận (`anyStaff`).
- Frontend: Chạy `npm run build` thành công (0 errors), bundle tạo ra sạch sẽ.
