# TASK-008 — Inventory và repair items
- **Trạng thái:** DONE
- **Ưu tiên:** Medium
- **Phụ thuộc:** TASK-007
- **Hoàn thành:** 2026-10-30

## Mục tiêu
Quản lý vật tư và xuất kho nguyên tử khi sử dụng cho phiếu.

## Tiêu chí nghiệm thu
- [x] Không xuất kho khi thiếu tồn; mọi biến động và giá snapshot có thể truy vết.

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-30 | `npm run lint; npm test` | PASS | 30 unit tests pass, bao gồm 18 tests mới cho validation vật tư, giao dịch kho, tồn âm và repair parts. |
| 2026-10-30 | `node src/scripts/verify-inventory-integration.js` | PASS | MySQL thật: tạo vật tư, nhập kho, xuất kho đủ tồn, từ chối xuất vượt tồn (409), kiểm tra lock và tồn không đổi sau thất bại, thêm vật tư vào phiếu REPAIRING tự động xuất kho và cập nhật `parts_total`, xóa vật tư hoàn kho và giảm `parts_total`, lọc tồn thấp, sổ giao dịch. Tự dọn sạch dữ liệu tạm. |
| 2026-10-30 | `node src/scripts/verify-repair-orders-integration.js` | PASS | Regression check không ảnh hưởng luồng repair orders. |
| 2026-10-30 | `node src/scripts/verify-workflow-integration.js` | PASS | Regression check không ảnh hưởng workflow phân công/chẩn đoán/báo giá. |

## Kết quả bàn giao
- API danh mục vật tư (`GET/POST /api/v1/inventory/items`, `GET/PATCH /api/v1/inventory/items/:id`) với quyền `inventory.manage`.
- API quản lý tồn kho (`GET /api/v1/inventory/stocks`, `GET /api/v1/inventory/stocks/:warehouseId/:itemId`) hỗ trợ lọc tồn thấp `lowStock=true`.
- API sổ biến động kho (`POST/GET /api/v1/inventory/transactions`) hỗ trợ các loại giao dịch `RECEIPT`, `ISSUE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER_IN`, `TRANSFER_OUT` với cơ chế khóa dòng chống tồn âm.
- API linh kiện phiếu sửa chữa (`GET/POST /api/v1/repair-orders/:id/parts`, `DELETE /api/v1/repair-orders/:id/parts/:partId`) tự động xuất/hoàn kho nguyên tử và snapshot giá.
