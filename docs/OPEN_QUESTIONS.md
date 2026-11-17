# Open questions
Những câu hỏi này cần câu trả lời trước task phụ thuộc; không suy đoán thành quyết định không thể đảo ngược.
| ID | Câu hỏi | Ảnh hưởng | Cần trước |
| --- | --- | --- | --- |
| Q-001 | Cửa hàng có một hay nhiều chi nhánh/kho? | Đã quyết định: nhiều chi nhánh/kho. | Đã xử lý tại TASK-002 |
| Q-002 | Dùng loại phiên xác thực nào (cookie server session hay JWT) và thời hạn bao lâu? | Đã quyết định: opaque Bearer session, 12 giờ. | Đã xử lý tại TASK-004 |
| Q-003 | Có cần khách hàng ký nhận, ảnh thiết bị và tệp đính kèm không? | Storage, privacy, UI | TASK-006 |
| Q-004 | Quy tắc phê duyệt báo giá: ai ghi nhận, có thời hạn/đặt cọc không? | Đã quyết định: nhân viên phụ trách (kỹ thuật viên được phân công hoặc quản lý) ghi nhận vào `quote_decision_history`; báo giá có `valid_until`; đặt cọc xử lý tại TASK-009. | Đã xử lý tại TASK-007 |
| Q-005 | Vật tư nhập từ đâu, có cho phép tồn âm/điều chỉnh thủ công không? | Đã quyết định: không cho phép tồn âm; hỗ trợ nhập kho thủ công và điều chỉnh tăng/giảm có kiểm soát tồn. | Đã xử lý tại TASK-008 |
| Q-006 | Chính sách bảo hành: thời hạn, điều kiện và tính phí sửa lại? | Đã quyết định: thời hạn bảo hành linh hoạt theo phiếu (`starts_at`, `ends_at`), điều kiện lưu tại `terms`. Phiếu bảo hành liên kết phiếu gốc qua `original_repair_order_id` và cùng thiết bị; điều chỉnh chi phí qua discount. | Đã xử lý tại TASK-009 |
| Q-007 | Báo cáo bắt buộc gồm chỉ số nào và xuất định dạng gì? | Reports | TASK-012 |
