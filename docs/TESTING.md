# Testing Guide & Results

Chiến lược kiểm thử dự án tuân thủ mô hình Kim tự tháp kiểm thử (Testing Pyramid) đảm bảo tính toàn vẹn nghiệp vụ, an toàn dữ liệu và không hồi quy.

---

## 1. Kim tự tháp Kiểm thử

- **Tầng 1 — Unit Tests**:
  - `repair-state-machine.test.js`: Kiểm thử 100% các bước chuyển trạng thái hợp lệ, từ chối chuyển trạng thái bất hợp lệ, yêu cầu lý do khi hủy/không sửa được, quyền cưỡng chế (override) của Quản lý.
  - `validation.test.js`: Kiểm tra bắt buộc/độ dài chuỗi, định dạng ngày `YYYY-MM-DD`, số nguyên dương ID, kiểu boolean.
  - `billing-service.test.js`: Tính toán công nợ (`balance = totalReceivable - totalPaid`), phân loại trạng thái thanh toán (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERPAID`).
  - `warranty-service.test.js`: Quy tắc ngày kết thúc bảo hành `endsAt >= startsAt`.
  - `inventory-service.test.js`: Kiểm tra tạo vật tư, ngăn tồn âm khi xuất kho (`ISSUE`) hoặc điều chỉnh giảm (`ADJUSTMENT_OUT`).
  - `password.test.js` & `pagination.test.js`: Hash mật khẩu bcrypt an toàn, allowlist trường sắp xếp ngăn SQL injection.

- **Tầng 2 — Integration Tests (Chạy trên MySQL thật)**:
  - `verify-repair-orders-integration.js`: Kiểm thử REST API tạo phiếu, audit trail lịch sử trạng thái append-only, các mã lỗi HTTP 401, 403, 409, 422.
  - `verify-workflow-integration.js`: Phân công kỹ thuật viên, chẩn đoán, tạo báo giá phiên bản (versioning), khách duyệt báo giá.
  - `verify-inventory-integration.js`: Nhập kho, xuất kho nguyên tử cho phiếu sửa chữa, hoàn kho khi xóa dòng phụ tùng, ngăn tồn âm.
  - `verify-billing-warranty-integration.js`: Thu tiền từng phần, chặn bàn giao máy khi nợ tiền (`409 OVERDUE_BALANCE`), kích hoạt thẻ bảo hành, tra cứu mã bảo hành công khai.
  - `verify-backup-restore.js`: Tự động tạo bảng kiểm tra, sao lưu dữ liệu, xóa bảng mô phỏng sự cố, khôi phục từ file backup và xác minh dữ liệu khớp 100%.

- **Tầng 3 — End-to-End (E2E) Flow Test**:
  - `verify-e2e-delivery.js`: Chạy toàn bộ hành trình nghiệp vụ từ đầu đến cuối:
    Khách hàng → Thiết bị → Phiếu sửa chữa (RECEIVED) → Phân công KTV → Chẩn đoán (DIAGNOSING) → Lập báo giá (WAITING_APPROVAL) → Khách duyệt (APPROVED) → Xuất kho linh kiện & Sửa chữa (REPAIRING) → Sửa xong (READY_FOR_PICKUP) → Chặn bàn giao khi còn nợ (409) → Thu tiền đủ (PAID) → Bàn giao máy (DELIVERED) → Cấp thẻ bảo hành → Tạo phiếu bảo hành lại (Warranty Claim) → Kiểm tra Báo cáo doanh thu & Kho.

---

## 2. Kết quả Kiểm thử Tổng hợp

| Bộ kiểm thử | Lệnh thực thi | Kết quả | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Unit Tests** | `npm test` | **34/34 PASS** (0 fail) | Thời gian: ~450ms |
| **Backend Lint** | `npm run lint` | **PASS (0 errors)** | Kiểm tra cú pháp tất cả file JS |
| **Repair Orders Integration** | `node src/scripts/verify-repair-orders-integration.js` | **PASS** | Tự tạo & dọn dẹp dữ liệu test |
| **Workflow Integration** | `node src/scripts/verify-workflow-integration.js` | **PASS** | Tự tạo & dọn dẹp dữ liệu test |
| **Inventory Integration** | `node src/scripts/verify-inventory-integration.js` | **PASS** | Tự tạo & dọn dẹp dữ liệu test |
| **Billing & Warranty Integration** | `node src/scripts/verify-billing-warranty-integration.js` | **PASS** | Tự tạo & dọn dẹp dữ liệu test |
| **E2E Delivery Verification** | `npm run test:e2e` | **PASS** | Toàn bộ vòng đời phiếu sửa chữa |
| **Backup & Restore Verification** | `node src/scripts/verify-backup-restore.js` | **PASS** | Khôi phục dữ liệu chính xác 100% |
| **Frontend Production Build** | `cd frontend && npm run build` | **PASS** | 44 modules transformed, 0 lỗi |
