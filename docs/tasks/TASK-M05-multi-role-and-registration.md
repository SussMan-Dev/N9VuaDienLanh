# TASK-M05 — Mở Rộng Đa Vai Trò Di Động (Lễ Tân, Thủ Kho, Kế Toán) & Đăng Ký Khách Hàng
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Người thực hiện:** AI Assistant
- **Phụ thuộc:** TASK-M04
- **Giai đoạn:** Phase M — Giai đoạn 5 (Hoàn thiện 6 Roles Chuyên Biệt Trên Mobile)

## Mục tiêu
Biến ứng dụng di động Điện Máy PRO thành giải pháp Enterprise hoàn chỉnh cho cả 6 vai trò:
1. Cho phép khách hàng mới đăng ký tài khoản trực tiếp trên ứng dụng (`RegisterScreen`).
2. Giao diện chuyên biệt cho Lễ tân (`ReceptionistDashboard`): Tiếp nhận/Từ chối đơn online, phân công KTV.
3. Giao diện chuyên biệt cho Thủ kho (`WarehouseDashboard`): Duyệt và xuất kho linh kiện nguyên tử cho KTV.
4. Giao diện chuyên biệt cho Kế toán (`AccountantDashboard`): Xem công nợ, thu tiền tại chỗ và bàn giao thiết bị.
5. Cập nhật điều hướng `RootNavigator` phân nhánh chính xác cho 6 vai trò.

## Phạm vi
1. **Màn hình Đăng ký Khách Hàng (`RegisterScreen.tsx`)**:
   - Form đăng ký: Họ tên, Số điện thoại, Địa chỉ, Tên đăng nhập, Mật khẩu, Xác nhận mật khẩu.
   - Nút chuyển đổi qua lại giữa Đăng nhập và Đăng ký.
   - Gọi `POST /api/v1/auth/register`, tự động đăng nhập vào Cổng Khách Hàng ngay sau khi tạo tài khoản thành công.
2. **Phân hệ Lễ tân (`ReceptionistStack.tsx` & `ReceptionistDashboardScreen.tsx`)**:
   - KPI: Đơn mới chờ duyệt (`PENDING`), Đơn đã tiếp nhận (`ACCEPTED`).
   - Thao tác 1-chạm "Chấp nhận" (`ACCEPTED`) hoặc "Từ chối" (`REJECTED` kèm modal ghi lý do).
   - Modal phân công Kỹ thuật viên phụ trách trực tiếp trên điện thoại.
3. **Phân hệ Thủ kho (`WarehouseStack.tsx` & `WarehouseDashboardScreen.tsx`)**:
   - KPI: Yêu cầu linh kiện chờ xử lý (`REQUESTED`), lịch sử đã xuất (`ISSUED`).
   - Xem chi tiết từng phụ tùng KTV đề xuất, số lượng.
   - Nút "Duyệt & Xuất kho" trừ tồn kho nguyên tử (`approvePartsRequest` + `issuePartsRequest`).
   - Nút "✕ Từ chối" kèm lý do (`rejectPartsRequest`).
4. **Phân hệ Kế toán (`AccountantStack.tsx` & `AccountantDashboardScreen.tsx`)**:
   - KPI: Phiếu sửa xong chờ thanh toán (`COMPLETED`), đơn đã thu đủ (`PAID`).
   - Modal thu tiền: Điền số tiền, chọn nhanh "Thu đủ còn nợ", "50%", phương thức (CASH/BANK_TRANSFER).
   - Tự động chuyển đơn sang `PAID` khi thu đủ 100%.
   - Bàn giao thiết bị cho khách (`DELIVERED`) khi công nợ bằng 0.
5. **Đồng bộ RootNavigator**:
   - Auth Stack: `LoginScreen` + `RegisterScreen`.
   - App Stack: 6 nhánh điều hướng tương ứng 6 vai trò:
     * `CUSTOMER` ➔ `CustomerTabs`
     * `ADMIN` | `MANAGER` ➔ `AdminStack`
     * `RECEPTIONIST` ➔ `ReceptionistStack`
     * `WAREHOUSE_STAFF` ➔ `WarehouseStack`
     * `ACCOUNTANT` ➔ `AccountantStack`
     * `TECHNICIAN` ➔ `TechnicianTabs`

## File đã thay đổi / tạo mới
- `mobile/src/api/auth.ts` (thêm hàm `register`)
- `mobile/src/api/parts-requests.ts` (thêm `approvePartsRequest`, `rejectPartsRequest`, `issuePartsRequest`)
- `mobile/src/api/repairs.ts` (thêm `createPayment`, `assignTechnician`)
- `mobile/src/screens/auth/RegisterScreen.tsx`
- `mobile/src/screens/auth/LoginScreen.tsx` (liên kết màn hình Đăng ký)
- `mobile/src/screens/receptionist/ReceptionistDashboardScreen.tsx`
- `mobile/src/screens/warehouse/WarehouseDashboardScreen.tsx`
- `mobile/src/screens/accountant/AccountantDashboardScreen.tsx`
- `mobile/src/navigation/ReceptionistStack.tsx`
- `mobile/src/navigation/WarehouseStack.tsx`
- `mobile/src/navigation/AccountantStack.tsx`
- `mobile/src/navigation/RootNavigator.tsx`

## Tiêu chí nghiệm thu
- [x] Khách hàng mới có thể đăng ký tài khoản thành công và lập tức vào Cổng Khách Hàng.
- [x] Lễ tân đăng nhập xem được đơn `PENDING`, bấm duyệt chuyển sang `ACCEPTED`, phân công KTV.
- [x] Thủ kho đăng nhập xem được yêu cầu linh kiện, bấm duyệt xuất kho thành công.
- [x] Kế toán đăng nhập xem được đơn `COMPLETED`, thu tiền thành công đưa đơn sang `PAID`.
- [x] TypeScript `tsc --noEmit` đạt 0 lỗi (100% Type-safe).

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-11-15 | `cd mobile && npx tsc --noEmit` | PASS (0 lỗi) | Đạt 100% an toàn kiểu dữ liệu |
| 2026-11-15 | `node --env-file=.env src/scripts/verify-mobile-e2e.js` | PASS 100% (12/12 bước) | Kịch bản liên thông đầy đủ |
| 2026-11-15 | Kiểm thử API `POST /api/v1/auth/register` | PASS (200 OK) | Tạo user & customer tự động |
