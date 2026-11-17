# TASK-009 — Payments, receivables và warranty
- **Trạng thái:** DONE
- **Ưu tiên:** Medium
- **Phụ thuộc:** TASK-008
- **Hoàn thành:** 2026-10-30

## Mục tiêu
Quản lý thanh toán nhiều lần, công nợ và liên kết bảo hành/sửa lại.

## Tiêu chí nghiệm thu
- [x] Thanh toán không vượt quy tắc; công nợ và trạng thái thanh toán chính xác.
- [x] Phiếu bảo hành/sửa lại liên kết phiếu gốc.

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-30 | `npm run lint; npm test` | PASS | 34 unit tests pass, bao gồm 4 tests mới cho validation thanh toán, tính toán công nợ và ngày bảo hành. |
| 2026-10-30 | `node src/scripts/verify-billing-warranty-integration.js` | PASS | MySQL thật: thanh toán từng phần (deposit), cập nhật balance và paymentStatus (`PARTIALLY_PAID`), chặn thanh toán vượt nợ khi không có quyền/ghi chú (409), quản lý ghi nhận thanh toán vượt nợ có lý do, chặn lễ tân hủy thanh toán (403), quản lý hủy thanh toán (`VOIDED`) và tính lại công nợ chính xác, chặn giao máy (`DELIVERED`) khi còn nợ (409 `OUTSTANDING_BALANCE_REMAINING`), thanh toán đủ cho phép giao máy, cấp bảo hành và tra cứu theo mã `warrantyCode`, tạo phiếu sửa lại liên kết `originalRepairOrderId` và kiểm tra danh sách claims. Tự dọn sạch dữ liệu tạm. |
| 2026-10-30 | `node src/scripts/verify-repair-orders-integration.js` | PASS | Regression check không ảnh hưởng luồng repair orders. |
| 2026-10-30 | `node src/scripts/verify-workflow-integration.js` | PASS | Regression check không ảnh hưởng luồng workflow. |
| 2026-10-30 | `node src/scripts/verify-inventory-integration.js` | PASS | Regression check không ảnh hưởng luồng quản lý kho. |

## Kết quả bàn giao
- API tổng hợp công nợ & thanh toán:
  - `GET /api/v1/repair-orders/:id/billing`: Trả về `totalReceivable`, `totalPaid`, `balance`, `paymentStatus`.
  - `GET/POST /api/v1/repair-orders/:id/payments`: Xem danh sách và tạo thanh toán (sinh mã biên lai `REC-...`).
  - `POST /api/v1/repair-orders/:id/payments/:paymentId/void`: Hủy thanh toán dành cho quản lý vận hành.
- Ràng buộc chuyển trạng thái giao máy: Chặn chuyển sang `DELIVERED` khi công nợ lớn hơn 0 (`409 OUTSTANDING_BALANCE_REMAINING`), trừ trường hợp quản lý override.
- API bảo hành:
  - `GET/POST /api/v1/repair-orders/:id/warranties`: Cấp và xem bảo hành (mã `WAR-...`).
  - `GET /api/v1/warranties/:code`: Tra cứu bảo hành theo mã kèm thông tin thiết bị và khách hàng.
  - `GET /api/v1/repair-orders/:id/warranty-claims`: Xem danh sách các phiếu bảo hành / sửa lại phát sinh từ phiếu gốc.
- Hỗ trợ tạo phiếu sửa lại / bảo hành: `POST /api/v1/repair-orders` hỗ trợ `originalRepairOrderId`, liên kết chặt chẽ với phiếu gốc trên cùng thiết bị.
