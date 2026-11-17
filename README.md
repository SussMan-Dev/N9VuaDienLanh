# Electrical Repair Management (Hệ thống Quản lý Sửa chữa Thiết bị Điện)

Hệ thống quản lý quy trình sửa chữa điện máy từ tiếp nhận thiết bị, phân công kỹ thuật viên, chẩn đoán lỗi, lập & duyệt báo giá theo phiên bản, xuất kho phụ tùng nguyên tử, thu tiền nhiều đợt, bàn giao máy và kích hoạt thẻ bảo hành.

---

## 1. Trạng thái Dự án

- **Toàn bộ 13 tasks (Phase 0 đến Phase 6) đã hoàn thành 100%**:
  - `TASK-001` — Project foundation (Git, cấu trúc, tài liệu baseline)
  - `TASK-002` — Database schema & migrations (MySQL InnoDB, 3 migrations)
  - `TASK-003` — Backend foundation (Express.js, request context, health checks)
  - `TASK-004` — Authentication & authorization (Session tokens, bcrypt, RBAC, login rate limit)
  - `TASK-005` — Customers & devices (Quản lý hồ sơ khách hàng và thiết bị)
  - `TASK-006` — Repair orders & state machine (Quy trình chuyển trạng thái và lịch sử audit)
  - `TASK-007` — Assignment, diagnosis & quotes (Phân công KTV, chẩn đoán, báo giá đa phiên bản)
  - `TASK-008` — Inventory & repair items (Quản lý kho, ngăn tồn âm, xuất kho linh kiện nguyên tử)
  - `TASK-009` — Payments, receivables & warranty (Thu tiền nhiều đợt, tính nợ, chặn giao máy khi nợ, bảo hành)
  - `TASK-010` — Frontend foundation & authentication (Vite React SPA, AuthContext, Layout, Login, Dashboard)
  - `TASK-011` — Core repair workflow UI (UI Khách hàng, Thiết bị, Danh sách phiếu, Tiếp nhận máy, Chi tiết phiếu 6 tab)
  - `TASK-012` — Operations & reports UI (UI Quản lý kho, cảnh báo tồn, nhật ký nhập xuất, Báo cáo dòng tiền & bảo hành)
  - `TASK-013` — Quality, delivery & operations guide (E2E verification, backup/restore, cẩm nang vận hành)

---

## 2. Kiến trúc & Công nghệ

- **Backend**: Node.js (>= v20), Express.js, MySQL2 pool, REST API, kiến trúc Services & Routers phân lớp.
- **Frontend**: React 18, Vite, React Router v6, Context API, CSS Variables, Responsive (Mobile/Desktop), tuân thủ 4 trạng thái UX (Loading, Empty, Error, Success).
- **Cơ sở dữ liệu**: MySQL 8.0+, InnoDB engine, UTC datetime, JSON support, Transaction ACID, Append-only audit logs.

---

## 3. Cài đặt và Khởi động

### 3.1. Thiết lập Database MySQL
Khởi động MySQL server và chạy lần lượt 3 migration trong thư mục `database/migrations/`:
```sql
CREATE DATABASE electrical_repair_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
Chạy lần lượt:
1. `database/migrations/202610270001_initial_schema.sql`
2. `database/migrations/202610270002_auth_sessions_and_permissions.sql`
3. `database/migrations/202610270003_devices_active_flag.sql`

### 3.2. Chạy Backend Server
```bash
cd backend
cp .env.example .env    # Điền mật khẩu DB_PASSWORD của MySQL
npm install
npm run bootstrap:admin # Khởi tạo tài khoản quản trị admin ban đầu
npm run dev             # Server lắng nghe tại http://localhost:3000
```

### 3.3. Chạy Frontend SPA
Mở một terminal mới:
```bash
cd frontend
npm install
npm run dev             # Ứng dụng chạy tại http://localhost:5173
```

---

## 4. Tài khoản Mặc định & Phân quyền (RBAC)

- **Tài khoản**: `admin`
- **Mật khẩu**: `Admin@12345678`

| Vai trò | Phân quyền kỹ thuật | Phạm vi hành động |
| :--- | :--- | :--- |
| **ADMIN** | Toàn quyền (`*`) | Quản trị hệ thống, chi nhánh, phân quyền người dùng. |
| **MANAGER** | `operations.manage`, `inventory.manage`, `reports.view` | Phân công KTV, override trạng thái, nhập/xuất kho, hủy thanh toán, xem báo cáo doanh thu. |
| **RECEPTIONIST** | `intake.manage` | Quản lý khách hàng & thiết bị, tạo phiếu tiếp nhận máy, thu tiền thanh toán. |
| **TECHNICIAN** | `repair.manage` | Chẩn đoán kỹ thuật, lập báo giá theo phiên bản, xuất linh kiện từ kho, cấp thẻ bảo hành. |

---

## 5. Kiểm thử (Test Suites)

Tất cả các tầng kiểm thử đều vượt qua 100%:
```bash
cd backend
npm test               # 34/34 Unit & State Machine Tests
npm run lint           # Kiểm tra cú pháp toàn bộ codebase backend
npm run test:e2e       # Kiểm thử trọn vẹn vòng đời nghiệp vụ từ A -> Z trên MySQL thật
npm run test:all       # Chạy toàn bộ unit, integration và E2E tests
```
Kiểm tra Frontend:
```bash
cd frontend
npm run lint           # Linting kiểm tra cảnh báo
npm run build          # Biên dịch SPA production (0 lỗi)
```

---

## 6. Sao lưu & Phục hồi (Backup & Restore)

- **Tài liệu chi tiết**: Xem [docs/OPERATIONS.md](file:///e:/electrical-repair-management/docs/OPERATIONS.md).
- **Sao lưu**: `powershell .\database\scripts\backup.ps1`
- **Phục hồi**: `powershell .\database\scripts\restore.ps1 -BackupFile <path-to-sql-file>`
- **Kiểm chứng tự động**: `cd backend && node src/scripts/verify-backup-restore.js`
