# TASK-006 — Repair orders và state machine
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-005
## Mục tiêu
Triển khai tiếp nhận phiếu, chuyển trạng thái hợp lệ và lịch sử bất biến.
## Tiêu chí nghiệm thu
- [x] Ma trận trạng thái hợp lệ, quyền và lỗi bị từ chối được đặc tả/test.
- [x] Mọi chuyển trạng thái ghi actor, thời gian và lý do/ghi chú khi cần.

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-27 | `npm run lint; npm test` | PASS | 8 pass, 0 fail; bao phủ ma trận, từ chối, lý do và override manager. |
| 2026-10-27 | `node src/scripts/verify-repair-orders-integration.js` | PASS | MySQL/API thật: 401, 403, 201, 200, 409, 422, history actor/lý do; tự dọn dữ liệu tạm. |

## Kết quả bàn giao
- API tiếp nhận/lấy danh sách-chi tiết/lịch sử phiếu và chuyển trạng thái.
- Lịch sử `NULL -> RECEIVED` và mọi transition được ghi append-only trong transaction.
- Override vào `REPAIRING` yêu cầu role `MANAGER`/`ADMIN` và lý do audit.
