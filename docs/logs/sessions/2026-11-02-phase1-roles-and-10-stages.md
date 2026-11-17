# Session Log: 2026-11-02 Phase 1 — Nền tảng Database, Roles & State Machine 10 Giai đoạn

## 1. Mục tiêu phiên làm việc
- Tiếp nhận yêu cầu mở rộng toàn diện hệ thống:
  - **6 Roles**: Admin, Lễ tân (Receptionist), Kỹ thuật viên (Technician), Thủ kho (Warehouse Staff), Kế toán (Accountant), Khách hàng (Customer).
  - **10 Giai đoạn nghiệp vụ**:
    - GĐ 1: Khách/Lễ tân tạo Ticket (`PENDING`)
    - GĐ 2: Lễ tân tiếp nhận (`ACCEPTED`) hoặc từ chối (`REJECTED` bắt buộc lý do)
    - GĐ 3: Admin phân công KTV (`ASSIGNED`)
    - GĐ 4: KTV chẩn đoán & lập báo giá gửi Admin (`AWAITING_ADMIN_APPROVAL`)
    - GĐ 5: Admin duyệt báo giá gửi khách hoặc yêu cầu KTV sửa lại (`AWAITING_CUSTOMER_APPROVAL`)
    - GĐ 6: Khách hàng xác nhận báo giá (`APPROVED`) hoặc từ chối (`CANCELLED`)
    - GĐ 7: KTV thực hiện sửa chữa (`IN_PROGRESS`), ghi nhật ký & ảnh
    - GĐ 8: Yêu cầu xuất linh kiện từ kho (`WAITING_PARTS`), tạo báo giá bổ sung nếu phát sinh chi phí
    - GĐ 9: Hoàn thành sửa chữa (`COMPLETED`)
    - GĐ 10: Kế toán lập hóa đơn, ghi nhận thanh toán (`PAID`)
- Triển khai **Phase 1: Nền tảng Database, Roles & State Machine**.

---

## 2. Các công việc đã thực hiện

### A. Database Migration
- Tạo migration `database/migrations/202611020001_phase1_roles_and_10_stages_schema.sql`:
  - Thêm permission: `billing.manage` ('Quản lý hóa đơn, thanh toán và công nợ').
  - Thêm roles: `ACCOUNTANT` ('Kế toán') và `WAREHOUSE_STAFF` ('Thủ kho').
  - Phân quyền cho `ACCOUNTANT`: `billing.manage`, `reports.view`, `intake.manage`.
  - Phân quyền cho `WAREHOUSE_STAFF`: `inventory.manage`, `warehouse.manage`.
  - Thêm cột vào bảng `repair_orders`:
    - `rejection_reason VARCHAR(500) NULL`: Lưu lý do từ chối tiếp nhận của lễ tân.
    - `paid_at DATETIME NULL`: Lưu thời gian thanh toán hoàn tất bởi kế toán.
  - Thêm cột vào bảng `quotes`:
    - `admin_approval_status VARCHAR(30) DEFAULT 'PENDING'`: Trạng thái duyệt của Admin (`PENDING`, `APPROVED`, `REJECTED`).
    - `admin_approved_by_user_id BIGINT UNSIGNED NULL`: Khóa ngoại trỏ đến `users(id)`.
    - `admin_approved_at DATETIME NULL`: Thời gian Admin duyệt.
    - `admin_reject_note VARCHAR(500) NULL`: Ghi chú yêu cầu KTV sửa lại của Admin.
    - `is_supplemental BOOLEAN DEFAULT FALSE`: Đánh dấu báo giá bổ sung khi phát sinh linh kiện.
  - Cập nhật check constraint trên `repair_orders.repair_status` và `repair_status_history.to_status` hỗ trợ đầy đủ 10 trạng thái mới cùng các trạng thái tương thích ngược.
- Chạy migration trên database MySQL `electrical_repair_management` thành công.
- Seed tài khoản demo Kế toán: `ketoan_hoa` / `Admin@12345678`.

### B. Backend State Machine & Auth
- `backend/src/lib/repair-state-machine.js`:
  - Mở rộng ma trận `transitions` hỗ trợ quy trình 10 giai đoạn chuẩn xác:
    - `PENDING` ➔ `ACCEPTED` hoặc `REJECTED` (yêu cầu `reason`).
    - `ACCEPTED` ➔ `ASSIGNED` ➔ `DIAGNOSING` ➔ `AWAITING_ADMIN_APPROVAL`.
    - `AWAITING_ADMIN_APPROVAL` ➔ `AWAITING_CUSTOMER_APPROVAL` (khi Admin duyệt) hoặc quay về `ASSIGNED`/`DIAGNOSING` (khi Admin yêu cầu sửa).
    - `AWAITING_CUSTOMER_APPROVAL` ➔ `APPROVED` hoặc `CANCELLED` (yêu cầu `reason`).
    - `APPROVED` ➔ `IN_PROGRESS` (chặn sửa chữa nếu chưa qua duyệt).
    - `IN_PROGRESS` ➔ `WAITING_PARTS` ➔ `COMPLETED`.
    - `COMPLETED` ➔ `PAID` (tách bạch giữa hoàn thành sửa chữa kỹ thuật và thu tiền kế toán).
    - `PAID` ➔ `DELIVERED`.
- `backend/src/services/repair-order-service.js`:
  - Cập nhật quy tắc: `COMPLETED` không yêu cầu công nợ bằng 0 (vì KTV chỉ sửa xong phần cứng), chỉ `PAID` hoặc `DELIVERED` mới bắt buộc công nợ bằng 0.
  - Lưu `rejection_reason` khi chuyển sang `REJECTED`, cập nhật `paid_at` khi chuyển sang `PAID`.
- `backend/src/routes/repair-orders.js`:
  - Cập nhật middleware: Cho phép `ACCOUNTANT` thực hiện thu tiền và chuyển trạng thái `PAID`.

### C. Frontend Refinement
- `frontend/src/contexts/AuthContext.jsx`:
  - Cập nhật `getPrimaryRole`: Hỗ trợ hiển thị vai trò "Kế toán" (`ACCOUNTANT`) và "Thủ kho" (`WAREHOUSE_STAFF`).
  - Hỗ trợ quyền ngầm định: `ACCOUNTANT` tự động có quyền `billing.manage` và `reports.view`.
- `frontend/src/utils/formatters.js`:
  - Bổ sung định dạng nhãn và badge màu cho các trạng thái mới: `PENDING`, `ACCEPTED`, `REJECTED`, `AWAITING_ADMIN_APPROVAL`, `AWAITING_CUSTOMER_APPROVAL`, `PAID`.
- `frontend/src/pages/UsersPage.jsx`:
  - Cập nhật `ROLE_BADGES`: Bổ sung huy hiệu cho Kế toán (`ACCOUNTANT`) và Thủ kho (`WAREHOUSE_STAFF`).

---

## 3. Kết quả kiểm thử
1. **Unit & Integration Tests**:
   - Viết mới `backend/test/stage-workflow.test.js` kiểm tra toàn bộ luồng 10 giai đoạn, các trường hợp ngoại lệ từ chối/sửa lại, và chặn nhảy cóc sửa chữa.
   - Chạy `cd backend; npm test`: **62/62 tests PASS** (100%).
2. **Frontend Build**:
   - `cd frontend; npm run build`: **PASS** trong 210ms (0 lỗi).
3. **Runtime Verification**:
   - Backend khởi động daemon trên cổng 3000.
   - Đăng nhập tài khoản `ketoan_hoa`: Nhận đúng token, role `['ACCOUNTANT']` và permissions `['billing.manage', 'intake.manage', 'reports.view']`.

