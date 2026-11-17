# Session Log: Sửa lỗi đơn hàng được phân công chưa hiển thị cho Kỹ thuật viên (2026-11-15)

## 1. Hiện tượng & Nguyên nhân gốc
- **Hiện tượng**: Quản trị viên (Admin) đã phân công đơn hàng cho Kỹ thuật viên trên ứng dụng di động, nhưng khi KTV vào màn hình "Phiếu sửa chữa" (`WorkOrderListScreen`) thì không thấy đơn hiển thị.
- **Nguyên nhân gốc phát hiện**:
  1. **Backend thiếu lọc `assignedTechnicianId`**: Trong `repair-order-service.js`, API `GET /api/v1/repair-orders` nhận tham số `assignedTechnicianId` nhưng không thêm điều kiện lọc vào SQL (`clauses`), khiến việc lọc theo KTV không hoạt động chính xác.
  2. **Thứ tự sắp xếp mặc định là cũ nhất trước (`ASC`)**: `pagination.js` mặc định `sortOrder: 'asc'`, cộng với `pageSize` mặc định là 20. Do hệ thống đã có hơn 75 phiếu sửa chữa, đơn mới được phân công nằm ở trang cuối nên không hiển thị ở trang đầu tiên.
  3. **Không nhận diện tham số `query.limit`**: `pagination.js` chỉ đọc `query.pageSize` mà bỏ qua `query.limit: 50` từ mobile gửi lên.
  4. **Lệch tài khoản KTV thử nghiệm**: Trong database KTV có sẵn tên là `ktv_tuan` (ID: 2, Nguyễn Văn Tuấn), nhưng trên giao diện `LoginScreen` lại có nút điền nhanh `ktv_dung` (chưa tồn tại) và mật khẩu cũ của `ktv_tuan` chưa được đồng bộ về `password123`.

## 2. Giải pháp & Triển khai

### 2.1. Backend (`backend/`)
- `backend/src/services/repair-order-service.js`:
  - Bổ sung mệnh đề lọc KTV:
    ```javascript
    if (query.assignedTechnicianId !== undefined) {
      clauses.push('EXISTS (SELECT 1 FROM repair_assignments ra WHERE ra.repair_order_id = ro.id AND ra.technician_user_id = ? AND ra.unassigned_at IS NULL)');
      values.push(positiveId(query.assignedTechnicianId, 'assignedTechnicianId'));
    }
    ```
  - Bổ sung tìm kiếm: `query.search` (`ro.code LIKE ? OR ro.reported_issue LIKE ?`).
  - Đặt sắp xếp mặc định theo `createdAt` giảm dần (`sortOrder: 'desc'`), đảm bảo các đơn mới phân công luôn xuất hiện ngay trên đầu danh sách.
- `backend/src/lib/pagination.js`:
  - Hỗ trợ cả `query.pageSize` lẫn `query.limit` (`query.pageSize ?? query.limit ?? '20'`).
- Khởi tạo đầy đủ tài khoản KTV trong database:
  - `ktv_tuan` (ID: 2, Nguyễn Văn Tuấn) / Mật khẩu: `password123`
  - `ktv_dung` (ID: 192, Nguyễn Văn Dũng) / Mật khẩu: `password123`
  - Đồng bộ cả `letan_mai`, `letan_lan`, `thukho_an`, `ketoan_hoa`.

### 2.2. Frontend Mobile (`mobile/`)
- `mobile/src/screens/technician/WorkOrderListScreen.tsx`:
  - Bổ sung thanh thông tin KTV trên cùng: hiển thị rõ ràng `👨‍🔧 KTV: [Tên] - Tài khoản: @[username] (ID: #[id])`.
  - Bổ sung 2 tab điều hướng:
    - Tab 1: `📌 Đơn của tôi` (lọc chính xác theo `assignedTechnicianId = user.id`).
    - Tab 2: `👥 Tất cả đơn đang xử lý` (hiển thị tất cả các đơn sửa chữa đang thực hiện tại cửa hàng, giúp KTV có thể theo dõi và hỗ trợ lẫn nhau).
  - Tích hợp `useFocusEffect` tự động làm mới khi KTV chuyển tab.
- `mobile/src/screens/auth/LoginScreen.tsx`:
  - Cung cấp nút chọn nhanh 1-click cho cả 2 KTV: **`🔧 KTV Tuấn`** (`ktv_tuan`) và **`🔧 KTV Dũng`** (`ktv_dung`) cùng mật khẩu `password123`.

## 3. Kiểm thử & Xác minh
- Chạy thử nghiệm query API: `GET /api/v1/repair-orders?limit=50&assignedTechnicianId=2` trả về đúng 7 đơn hàng được giao cho KTV Tuấn, trong đó đơn vừa được phân công `#RO-20261115-EUPK` (trạng thái `ASSIGNED`) nằm ngay vị trí số 1.
- Mobile TypeScript: `cd mobile && npx tsc --noEmit` ➔ **PASS 100% (0 lỗi)**.
- Backend Tests: `cd backend && npm test` ➔ **63/63 PASS**.
- Full Integration Suite: `cd backend && npm run test:all` ➔ **8/8 suites PASS 100%**.
- Tự động sinh tài liệu: `npm run docs:generate` hoàn tất.
