# Session Log — Phase 5: Giai đoạn 9 (Hoàn thành sửa chữa) & Giai đoạn 10 (Thanh toán & Hóa đơn)

**Ngày**: 2026-11-02  
**Mục tiêu**: Hoàn thiện Giai đoạn 9 (`COMPLETED`) và Giai đoạn 10 (`PAID`), phân biệt rành mạch giữa hoàn thành sửa chữa kỹ thuật và hoàn tất thu tiền kế toán; tự động chuyển sang `PAID` khi số dư nợ bằng 0.

## 1. Việc đã thực hiện

### Backend
1. **Xử lý tự động chuyển trạng thái `PAID` (`billing-service.js`)**:
   - Khi Kế toán ghi nhận thanh toán (`POST /api/v1/repair-orders/:id/payments`):
   - Tính toán lại tổng tiền đã thu và số dư nợ mới (`newBalance`).
   - Nếu `newBalance <= 0` và phiếu đang ở trạng thái `COMPLETED` (hoặc `WAITING_PAYMENT`):
     - Tự động cập nhật `repair_status = 'PAID'`, `paid_at = UTC_TIMESTAMP()`.
     - Tự động ghi nhận lịch sử trạng thái trong `repair_status_history` với lý do "Khách hàng thanh toán hoàn tất đầy đủ 100% chi phí".
2. **Quyền hạn chuyển trạng thái Kế toán & Lễ tân (`repair-order-service.js`)**:
   - Bổ sung `canAccountantTransition`: Kế toán (`ACCOUNTANT` / `billing.manage`) có quyền chuyển từ `COMPLETED` sang `PAID` hoặc `DELIVERED`.
   - Bổ sung quyền bàn giao `DELIVERED` từ `PAID` cho cả Lễ tân (`canReceptionistTransition`) tại quầy trả máy cho khách.
   - Siết chặt kiểm tra số dư nợ: Nếu còn nợ (`balance > 0`), ném lỗi `409 OUTSTANDING_BALANCE_REMAINING` chặn chuyển sang `PAID` hoặc `DELIVERED` (trừ khi có manager override).
3. **Phân quyền tạo và xem Hóa đơn (`routes/invoices.js`)**:
   - Bổ sung quyền `billing.manage` vào các endpoint tạo hóa đơn, xem danh sách và xem chi tiết hóa đơn.

### Frontend
1. **Chi tiết phiếu (`RepairDetailPage.jsx`)**:
   - Phân biệt rõ tiến trình Giai đoạn 9 (`COMPLETED`) và Giai đoạn 10 (`PAID`):
     - Khi `COMPLETED`: Hiển thị badge xanh lá `✅ GĐ 9: Đã hoàn tất sửa chữa — Chờ Kế toán lập hóa đơn & thu tiền`, kèm nút 1-click chuyển đến tab Thu tiền & Lập hóa đơn.
     - Khi `PAID`: Hiển thị badge `💳 GĐ 10: Đã thanh toán đầy đủ (paidAt)`, nút xem Hóa đơn & Biên lai, và nút `🚚 Bàn giao thiết bị cho khách (DELIVERED)`.
   - Tab Thanh toán & Công nợ:
     - Hiển thị banner lớn màu xanh xác nhận `💳 ĐÃ HOÀN TẤT THANH TOÁN (GIAI ĐOẠN 10)` cùng thời gian `paidAt`.
     - Phân quyền nút "+ Thu tiền / Thêm thanh toán (Kế toán)" cho tài khoản có quyền `billing.manage` (`canBill`).

## 2. Kết quả kiểm thử
1. **Kịch bản kiểm thử runtime tích hợp (`scratch/test-phase5-workflow.js`)**:
   - Đăng nhập 5 vai trò (Customer, Lễ tân, Admin, KTV, Kế toán `ketoan_hoa`).
   - Khách hàng tạo ticket `PENDING` -> Lễ tân duyệt `ACCEPTED` -> Admin phân công KTV -> KTV lập báo giá -> Admin duyệt báo giá -> Khách hàng duyệt báo giá -> KTV sửa chữa `IN_PROGRESS` -> KTV cập nhật nhật ký & xác nhận hoàn tất -> Ticket sang `COMPLETED` (lưu `completed_at`).
   - Kế toán `ketoan_hoa` tạo hóa đơn `INV-...` (tính đúng 1.200.000 VNĐ).
   - Thử chuyển sang `PAID` khi chưa thanh toán -> Bị chặn với lỗi `409 OUTSTANDING_BALANCE_REMAINING`.
   - Kế toán ghi nhận thanh toán 1.200.000 VNĐ -> Ticket **tự động chuyển sang `PAID`**, ghi nhận `paid_at`.
   - Lễ tân bàn giao máy cho khách -> Chuyển sang `DELIVERED`, lưu `delivered_at`.
   - **Kết quả: 13/13 bước PASS 100%**.
2. **Kiểm thử đơn vị Backend**: `63/63 tests PASS`.
3. **Frontend build**: `npm run build` thành công, 0 lỗi.

