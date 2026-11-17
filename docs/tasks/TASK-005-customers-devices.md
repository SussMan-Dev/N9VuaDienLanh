# TASK-005 — Customers và devices
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-004
## Mục tiêu
Triển khai API quản lý khách hàng và thiết bị, bảo toàn quan hệ một khách hàng-nhiều thiết bị.
## Phạm vi
- CRUD không xóa cứng cho customer/device, validation, pagination, search và sort allowlist.
- Phân quyền `intake.manage` ở backend và migration deactivate thiết bị.
## Không thuộc phạm vi
- UI, phiếu sửa chữa, upload ảnh/tệp và hợp nhất khách hàng trùng.
## File dự kiến thay đổi
- `database/migrations/202610270003_devices_active_flag.sql`
- `backend/src/routes/customers.js`, `backend/src/routes/devices.js`, `backend/src/services/**`, `backend/src/lib/**`
- `docs/API_SPEC.md`, `docs/BUSINESS_RULES.md`, `docs/DATABASE.md`, `docs/TESTING.md`
## Rủi ro và giả định
- Migration 003 cần chạy trước endpoint devices vì thêm `devices.is_active`.
- Code khách hàng do backend sinh; mã không phải đầu vào của client.
## Tiêu chí nghiệm thu
- [x] CRUD không xóa cứng, lọc/phân trang an toàn, validation và quyền backend được kiểm thử.
- [x] API/DATABASE/BUSINESS_RULES được cập nhật.
## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-10-27 | Chạy migration 003 trên MySQL Workbench | NOT RUN | Chờ xác minh cục bộ. |
| 2026-10-27 | `npm run lint; npm test` | NOT RUN | Sandbox không thể khởi tạo process. |
| 2026-10-27 | Authenticated customer/device API workflow | NOT RUN | Chờ người dùng kiểm tra với Bearer token. |
| 2026-10-27 | Migration 003 + customer/device create, update, deactivate | PASS | Customer id 1 được tạo/cập nhật; device id 1 tạo thành công và `isActive=false` sau deactivate. |
| 2026-10-27 | `npm run lint` | PASS | Syntax checks cho source customer/device và backend liên quan không báo lỗi. |
| 2026-10-27 | `npm test` | PASS | 5 pass, 0 fail; gồm pagination allowlist và unsafe sort rejection. |
## Kết quả bàn giao
- Đã tạo mã nguồn API và migration 003.
## Vấn đề còn tồn tại
- Dữ liệu test customer có ký tự tiếng Việt hiển thị không nhất quán trong PowerShell; cần dùng terminal UTF-8 khi kiểm tra hiển thị, không ảnh hưởng cấu trúc schema/API đã xác minh.
