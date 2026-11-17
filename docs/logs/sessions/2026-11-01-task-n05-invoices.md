# Session Log: 2026-11-01 — TASK-N05 (Invoice API)

## Bối cảnh & Mục tiêu
- **Mục tiêu**: Xây dựng toàn bộ API tạo, quản lý và xuất hóa đơn sửa chữa (`invoices`) tách biệt độc lập với giao dịch thanh toán:
  1. Cho phép lễ tân/quản lý tạo hóa đơn từ phiếu sửa chữa (`POST /api/v1/repair-orders/:orderId/invoice`).
  2. Tự động tính toán tổng tiền nhân công (`labor_total`), tiền linh kiện (`parts_total`), chiết khấu và tổng thanh toán (`grand_total`).
  3. Sinh mã hóa đơn chuẩn `INV-YYYYMMDD-XXXX`.
  4. Cung cấp giao diện xem và in hóa đơn chuẩn (`GET /api/v1/invoices/:id/print`) với định dạng hóa đơn tiếng Việt chuyên nghiệp, hỗ trợ in hoặc lưu PDF trực tiếp qua trình duyệt.

## Các thay đổi đã thực hiện
1. **Service (`backend/src/services/invoice-service.js`)**:
   - `createInvoice`: Tạo hóa đơn từ thông tin phiếu sửa chữa, snapshot chi phí, sinh mã hóa đơn duy nhất.
   - `getInvoice`: Tra cứu chi tiết một hóa đơn kèm thông tin khách hàng, người phát hành.
   - `listInvoices`: Phân trang danh sách hóa đơn, hỗ trợ lọc theo mã hóa đơn và mã phiếu.
   - `getInvoicePrintableHtml`: Tạo bản in HTML chuyên nghiệp có logo Điện Lạnh PRO, bảng chi tiết linh kiện thay thế, tổng tiền công, tiền hàng, tiền đã trả, công nợ còn thiếu và nút in/lưu PDF.
2. **Routes (`backend/src/routes/invoices.js`)**:
   - `POST /api/v1/repair-orders/:orderId/invoice`
   - `GET /api/v1/invoices`
   - `GET /api/v1/invoices/:id`
   - `GET /api/v1/invoices/:id/print` (trả về Content-Type `text/html; charset=utf-8`)
3. **Tích hợp (`backend/src/app.js` & `backend/package.json`)**:
   - Mount router tại `/api/v1/invoices` và `/api/v1/repair-orders/:orderId/invoice`.
   - Cập nhật kịch bản kiểm tra cú pháp `npm run lint`.
4. **Kiểm thử tự động (`backend/test/invoices.test.js`)**:
   - Bổ sung 4 kiểm thử kiểm tra tính toán subtotal, grandTotal, xử lý giảm giá vượt quá subtotal và ép kiểu id.

## Kết quả kiểm thử
- `cd backend && npm run lint`: PASS (0 lỗi).
- `cd backend && npm test`: 52/52 tests PASS.

