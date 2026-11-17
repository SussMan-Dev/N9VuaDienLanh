# TASK-007 — Assignment, diagnosis và quotes
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-006
## Mục tiêu
Phân công kỹ thuật viên, chẩn đoán và báo giá có lịch sử quyết định.
## Tiêu chí nghiệm thu
- [x] Kỹ thuật viên chỉ thao tác phiếu hợp lệ; báo giá duyệt/từ chối được truy vết.
- [x] Không thể vào sửa chữa khi chưa có phê duyệt hợp lệ, trừ ngoại lệ được ghi nhận.

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-30 | `npm run lint; npm test` | PASS | 12 pass, 0 fail; bao phủ liveness/readiness, pagination, password, validation, state machine. |
| 2026-10-30 | `node src/scripts/verify-repair-orders-integration.js` | PASS | Regression check cho luồng repair orders, intake, và transitions. |
| 2026-10-30 | `node src/scripts/verify-workflow-integration.js` | PASS | MySQL/API thật: phân quyền phân công (chỉ Manager/Admin), chặn kỹ thuật viên chưa phân công (403 NOT_ASSIGNED), chẩn đoán, báo giá phân phiên bản kèm `quote_items`, lưu vết duyệt/từ chối `quote_decision_history`, chặn `REPAIRING` khi báo giá bị từ chối / chưa duyệt, duyệt báo giá snapshot tiền vào phiếu và cho phép vào `REPAIRING`, manager override có lý do. Tự dọn sạch dữ liệu tạm. |

## Kết quả bàn giao
- API phân công kỹ thuật viên (`GET/POST /api/v1/repair-orders/:id/assignments`) với quyền `operations.manage`.
- Ràng buộc phân quyền: Kỹ thuật viên chỉ thao tác (chuyển trạng thái, chẩn đoán, báo giá, cập nhật quyết định) trên phiếu mình được phân công tích cực.
- API chẩn đoán (`GET/POST /api/v1/repair-orders/:id/diagnostics`).
- API báo giá và chi tiết (`GET/POST /api/v1/repair-orders/:id/quotes`, `GET /api/v1/repair-orders/:id/quotes/:quoteId`) hỗ trợ danh sách `quote_items`, tính toán và phiên bản tự tăng.
- API ghi nhận quyết định báo giá (`POST /api/v1/repair-orders/:id/quotes/:quoteId/decisions`) ghi vết vào `quote_decision_history` và snapshot tiền sang `repair_orders` khi `APPROVED`.
- Chặn chuyển sang `REPAIRING` nếu không có báo giá `APPROVED` (trừ trường hợp manager override kèm lý do ghi vết).
