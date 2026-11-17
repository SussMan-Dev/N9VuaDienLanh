# TASK-003 — Backend foundation
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-002
## Mục tiêu
Khởi tạo ExpressJS, cấu hình môi trường, MySQL, validation, error handling và logging tối thiểu.
## Tiêu chí nghiệm thu
- [x] Có health endpoint, cấu hình môi trường không chứa secret commit và kết nối database được kiểm tra.
- [x] Có xử lý lỗi tập trung, validation cấu hình và cấu trúc route/controller/service phù hợp.
- [x] Lint/test cấu hình được chạy và ghi kết quả; chưa có build step vì backend chạy trực tiếp bằng Node.js.
## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-27 | `npm install; npm run lint; npm test` | NOT RUN | Sandbox không khởi tạo được process trước khi thực thi. |
| 2026-10-27 | `GET /health`, `GET /api/v1/health` với MySQL cục bộ | NOT RUN | Chờ người dùng cấu hình `backend/.env` và chạy cục bộ. |
| 2026-10-27 | `npm test` | PASS | Người dùng xác nhận 2 tests pass, 0 fail. |
| 2026-10-27 | `GET /health`, `GET /api/v1/health` với MySQL cục bộ | PASS | Cả liveness và readiness trả `200`; readiness báo database `ok`. |
| 2026-10-27 | `npm run lint` | PASS | Kiểm tra cú pháp `server.js`, `app.js`, `env.js` không báo lỗi. |
## Kết quả bàn giao
- Đã tạo source backend foundation và test health.
## Vấn đề còn tồn tại
- Chưa có endpoint nghiệp vụ; xác thực/phân quyền là phạm vi TASK-004.
