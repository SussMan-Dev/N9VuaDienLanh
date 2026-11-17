# TASK-012 — Operations và reports UI
- **Trạng thái:** DONE
- **Ưu tiên:** Medium
- **Phụ thuộc:** TASK-009, TASK-010

## Mục tiêu
Xây dựng giao diện người dùng cho quản lý kho vật tư, kiểm soát tồn kho thực tế, nhập/xuất kho, nhật ký giao dịch thanh toán toàn hệ thống, báo cáo bảo hành và bảng điều khiển tổng hợp số liệu vận hành cơ bản.

## Tiêu chí nghiệm thu
- [x] Các màn hình xử lý được dữ liệu trống/lỗi và tuân quyền.
  - Quản lý Kho vật tư & Linh kiện (`InventoryPage.jsx`):
    - Danh mục mặt hàng (`items`): Danh sách mã SKU, tên, đơn vị tính, giá vốn chuẩn, giá bán đề xuất, mức tồn tối thiểu, trạng thái. Modal tạo mới và chỉnh sửa mặt hàng.
    - Tồn kho & Cảnh báo (`stocks`): Lọc theo từng kho hàng, bộ lọc cảnh báo thiếu hàng (`lowStock`), hiển thị số lượng tồn thực tế, đang giữ, mức tối thiểu, badge cảnh báo.
    - Lịch sử nhập / xuất (`transactions`): Bảng nhật ký giao dịch kho (RECEIPT, ISSUE, ADJUSTMENT_IN, ADJUSTMENT_OUT), số lượng, đơn giá vốn snapshot, người thực hiện. Modal lập phiếu nhập/xuất kho.
    - Phân quyền: `inventory.manage` cho các hành động thay đổi kho, `repair.manage` xem danh mục vật tư tra cứu.
  - Báo cáo Vận hành & Doanh thu (`ReportsPage.jsx`):
    - Thẻ chỉ số tổng quan (KPI Cards): Tổng thực thu, công nợ còn phải thu, tổng số phiếu sửa chữa, số mặt hàng cảnh báo thiếu kho.
    - Phân bố trạng thái phiếu sửa chữa: Hiển thị số lượng và thanh tỷ lệ phần trăm theo từng trạng thái quy trình.
    - Dòng tiền & Thanh toán: Lọc theo hình thức (CASH, BANK_TRANSFER, CARD), bảng toàn bộ các khoản thu tiền toàn hệ thống.
    - Thống kê bảo hành: Danh sách tất cả thẻ bảo hành đã cấp, thời hạn, ngày bắt đầu/kết thúc, tình trạng hiệu lực.
    - Phân quyền: `reports.view` hoặc `operations.manage`.
  - Tuân thủ quy chuẩn 4 trạng thái: Loading, Empty, Error (kèm Retry) và Success trên mọi màn hình.

## Kiểm thử & Xác thực
- Backend:
  - Bổ sung `GET /api/v1/inventory/warehouses` và nới quyền tra cứu kho cho kỹ thuật viên.
  - Bổ sung service & router `report-service.js` và `reports.js` (`/api/v1/reports/summary`, `/api/v1/reports/payments`, `/api/v1/reports/warranties`).
  - `npm test`: 34/34 tests passing.
  - `npm run lint`: 0 lỗi cú pháp.
- Frontend:
  - `npm run build`: Thành công không có lỗi (44 modules transformed, bundle tạo ra sạch sẽ).
