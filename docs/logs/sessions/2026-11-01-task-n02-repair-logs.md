# Session Log: 2026-11-01 — TASK-N02 (Repair Logs API)

## Bối cảnh & Mục tiêu
- **Mục tiêu**: Xây dựng toàn bộ API quản lý nhật ký sửa chữa nhiều lần trên một phiếu (`repair_logs`), cho phép kỹ thuật viên ghi nhận tiến trình, tình trạng thiết bị ban đầu, nguyên nhân, công việc thực hiện, kết quả kiểm tra và danh sách URL ảnh trước/sau sửa chữa.
- **Tiêu chuẩn**: Sử dụng Express.js + MySQL raw query (không ORM), validate chặt chẽ, kiểm tra quyền tác giả hoặc quyền quản lý khi chỉnh sửa/xóa.

## Các thay đổi đã thực hiện
1. **Service (`backend/src/services/repair-log-service.js`)**:
   - `listRepairLogs`: Phân trang danh sách nhật ký kèm họ tên kỹ thuật viên thực hiện (`users.full_name`).
   - `getRepairLog`: Lấy chi tiết một nhật ký sửa chữa.
   - `createRepairLog`: Tạo nhật ký sửa chữa mới, lưu ảnh dạng JSON array, tự động gắn `technician_user_id = authCtx.user.id`.
   - `updateRepairLog`: Cập nhật linh hoạt các trường (workPerformed, deviceCondition, rootCause, testResult, notes, imagesBefore, imagesAfter). Chỉ cho phép người tạo hoặc quản lý (`ADMIN`/`MANAGER`) chỉnh sửa.
   - `deleteRepairLog`: Chỉ cho phép người tạo hoặc `ADMIN` xóa nhật ký.
2. **Routes (`backend/src/routes/repair-logs.js`)**:
   - `GET /api/v1/repair-orders/:orderId/logs`: Danh sách nhật ký.
   - `POST /api/v1/repair-orders/:orderId/logs`: Tạo nhật ký mới.
   - `GET /api/v1/repair-orders/:orderId/logs/:logId`: Xem chi tiết.
   - `PATCH /api/v1/repair-orders/:orderId/logs/:logId`: Cập nhật.
   - `DELETE /api/v1/repair-orders/:orderId/logs/:logId`: Xóa.
3. **Tích hợp (`backend/src/app.js` & `backend/package.json`)**:
   - Mount router tại `/api/v1/repair-orders/:orderId/logs`.
   - Thêm files mới vào kịch bản kiểm tra cú pháp `npm run lint`.
4. **Kiểm thử tự động (`backend/test/repair-logs.test.js`)**:
   - Bổ sung 5 assertions kiểm tra validation cho `workPerformed`, các trường optional, độ dài tối đa 5000 ký tự và ép kiểu số nguyên dương cho `orderId`/`logId`.

## Kết quả kiểm thử
- `cd backend && npm run lint`: PASS (0 lỗi).
- `cd backend && npm test`: 39/39 tests PASS (34 tests cũ + 5 tests mới).

