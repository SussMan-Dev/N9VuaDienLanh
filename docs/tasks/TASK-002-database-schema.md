# TASK-002 — Database schema và migrations đầu tiên
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Người thực hiện:** Chưa phân công
- **Phụ thuộc:** TASK-001
## Mục tiêu
Chuyển mô hình dữ liệu MVP thành schema MySQL có migration tái lập được.
## Phạm vi
- Chốt cột, kiểu, unique key, foreign key, index và audit timestamps.
- Tạo migration database trống cho users, customers, devices, orders, history, diagnostics, quotes, parts, payments.
- Tạo seed phát triển tối thiểu và cập nhật `docs/DATABASE.md`.
## Không thuộc phạm vi
- UI, API hoặc tích hợp thanh toán.
## Tiêu chí nghiệm thu
- [x] Migration chạy thành công trên MySQL trống.
- [x] Ràng buộc quan hệ, unique keys và kiểu tiền được kiểm chứng.
- [x] `DATABASE.md` phản ánh schema đầy đủ.
- [x] Kết quả test được ghi tại đây.
## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-27 | Chạy migration và seed trên MySQL trống bằng MySQL Workbench | PASS | Người dùng xác nhận 26 bảng; branch `HN-01`, warehouse `HN-01-MAIN` và 4 roles mẫu đã tồn tại. |
## Kết quả bàn giao
Đã thêm migration schema MySQL ban đầu và seed dữ liệu tham chiếu phát triển.
## Vấn đề còn tồn tại
- Chưa có automated migration runner; đây là phạm vi backend foundation (TASK-003).
## Tài liệu đã cập nhật
`docs/DATABASE.md`, `docs/BUSINESS_RULES.md`, `docs/DECISIONS.md`, `docs/OPEN_QUESTIONS.md`.
## Liên kết
- Session log:
- Quyết định liên quan:
