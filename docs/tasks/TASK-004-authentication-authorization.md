# TASK-004 — Authentication và authorization
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-003
## Mục tiêu
Xác thực tài khoản và phân quyền backend cho bốn vai trò mặc định.
## Phạm vi
- Session Bearer có thể thu hồi, login/logout/current identity và middleware quyền.
- Hash mật khẩu, migration session/default permissions, bootstrap admin cục bộ.
## Không thuộc phạm vi
- UI đăng nhập, quản trị nhân viên/role/permission và reset mật khẩu.
## File dự kiến thay đổi
- `database/migrations/202610270002_auth_sessions_and_permissions.sql`
- `backend/src/routes/auth.js`, `backend/src/middleware/**`, `backend/src/lib/**`, `backend/src/scripts/bootstrap-admin.js`
- `docs/API_SPEC.md`, `docs/SECURITY.md`, `docs/DECISIONS.md`, `docs/OPEN_QUESTIONS.md`
## Rủi ro và giả định
- Cần chạy migration 002 sau migration 001 trước khi khởi động backend.
- Rate limit ở memory chỉ đủ cho một backend process trong development/MVP.
## Tiêu chí nghiệm thu
- [x] Đăng nhập, danh tính hiện tại, logout và lỗi an toàn được đặc tả/test.
- [x] Quyền mặc định được seed vào backend; tài khoản `ADMIN` đã xác minh trả permissions.
## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-27 | `npm run lint; npm test` | NOT RUN | Chờ chạy cục bộ sau khi cập nhật source. |
| 2026-10-27 | Migration 002 + login/me/logout bằng Bearer token | NOT RUN | Chờ người dùng chạy MySQL Workbench và local backend. |
| 2026-10-27 | `npm run lint` | PASS | Người dùng xác nhận mọi Node syntax checks thành công. |
| 2026-10-27 | `npm test` | PASS | Người dùng xác nhận 3 tests pass, 0 fail. |
| 2026-10-27 | Login → `GET /auth/me` → logout | PASS | Token hợp lệ trả user ADMIN/permissions; logout trả 204. |
| 2026-10-27 | `npm run reset:password` | PASS | Đổi mật khẩu admin và thu hồi các session cũ thành công. |
## Kết quả bàn giao
- Đã tạo source authentication/authorization và migration đi kèm.
## Vấn đề còn tồn tại
- Rate limit đang in-memory; cần shared store nếu triển khai nhiều backend instance.
