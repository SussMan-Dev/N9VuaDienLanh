# Session Log: Sửa lỗi phiên đăng nhập (Login Session Fix)

**Ngày:** 2026-11-01
**Mục tiêu:** Khắc phục triệt để các lỗi liên quan đến phiên đăng nhập (login session), lỗi 401 bị nhầm lẫn thành hết hạn phiên, đồng bộ độ dài mật khẩu và cơ chế duy trì phiên làm việc liên tục (sliding expiration).

## 1. Nguyên nhân gốc rễ được phát hiện

1. **Sai lệch thông báo lỗi khi đăng nhập thất bại (401 Interceptor Bug)**:
   - Trong `frontend/src/api/client.js`, khi nhận mã phản hồi 401 từ bất kỳ endpoint nào, interceptor tự động gán thông báo lỗi cứng: `'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'` và ép chuyển hướng `window.location.href = '/login'`.
   - Khi người dùng nhập sai tài khoản hoặc mật khẩu tại màn hình `/login`, API trả về 401 `INVALID_CREDENTIALS`. Thay vì hiển thị thông báo "Tên đăng nhập hoặc mật khẩu không chính xác", màn hình lại báo "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại", gây hoang mang cho người dùng.
2. **Bất đồng bộ ràng buộc độ dài mật khẩu**:
   - Trong `backend/src/routes/auth.js`: hàm `validCredentials` yêu cầu `password.length >= 12` và `/register` yêu cầu `password.length >= 12`.
   - Trong khi đó, tại `user-service.js` và `customer-service.js`, độ dài mật khẩu khi admin tạo người dùng hoặc cấp tài khoản khách hàng chỉ yêu cầu tối thiểu 6 ký tự (`min: 6, max: 100`).
   - Kết quả: Khi người dùng hoặc khách hàng có mật khẩu từ 6-11 ký tự đăng nhập, hệ thống từ chối bằng lỗi 422 `VALIDATION_ERROR: password must be 12-256 characters`.
3. **Thời hạn phiên ngắn và thiếu cơ chế gia hạn tự động**:
   - Session chỉ tồn tại 12 giờ cố định (`sessionHours = 12`) và không được gia hạn khi người dùng vẫn đang làm việc.
   - Khi tab để qua đêm hoặc làm việc liên tục, phiên bị hết hạn đột ngột.
4. **Thiếu điều hướng phân quyền sau khi đăng nhập và 403 ở Dashboard**:
   - Khách hàng (`CUSTOMER`) sau khi đăng nhập bị chuyển hướng mặc định vào `/dashboard`. Tại đây, Dashboard gọi API `/api/v1/reports/summary` (chỉ dành cho quản trị viên/quản lý) dẫn đến lỗi 403 Forbidden.

## 2. Các thay đổi đã thực hiện

### 2.1. Backend (`backend/src/routes/auth.js`, `backend/src/middleware/authenticate.js`, `backend/src/routes/repair-orders.js`)
- Đồng bộ chuẩn hóa độ dài mật khẩu: `password.length >= 6` trong `validCredentials` và `/api/v1/auth/register`.
- Nâng thời gian sống của token phiên từ 12 giờ lên 72 giờ (`const sessionHours = 72`).
- Bổ sung cơ chế Sliding Session Expiration trong middleware `authenticate.js`: mỗi khi người dùng gửi request có Bearer token hợp lệ, hệ thống tự động cập nhật `last_seen_at = UTC_TIMESTAMP()` và gia hạn `expires_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 72 HOUR)`, ngăn chặn tình trạng bị ngắt phiên giữa chừng khi đang thao tác.
- Bổ sung trả về `branchId` trong endpoint `/api/v1/auth/me`.
- Bổ sung quyền `warehouse.manage` và `inventory.manage` vào danh sách `anyStaff` trong `repair-orders.js` để thủ kho có thể truy vấn danh sách đơn hàng liên quan.

### 2.2. Frontend (`frontend/src/api/client.js`, `frontend/src/contexts/AuthContext.jsx`, `frontend/src/pages/LoginPage.jsx`, `frontend/src/pages/DashboardPage.jsx`)
- Phân biệt rõ request `/api/v1/auth/login` với các request khác trong `client.js`: khi đăng nhập sai trả về 401, hiển thị chính xác thông báo từ máy chủ ("Tên đăng nhập hoặc mật khẩu không chính xác") thay vì "Phiên đăng nhập đã hết hạn".
- Chỉ xóa token và chuyển hướng khi thực sự là token hết hạn/không hợp lệ trên các trang được bảo vệ.
- Bổ sung khối `.catch()` an toàn trong `AuthContext.jsx` khi khôi phục session lúc tải trang, tránh trường hợp ứng dụng bị kẹt ở trạng thái loading vô tận khi kết nối mạng chập chờn.
- Trong `LoginPage.jsx`: sau khi đăng nhập thành công, nếu tài khoản là `CUSTOMER`, tự động chuyển hướng đến `/portal` (Cổng dịch vụ khách hàng); nếu là nhân viên chuyển đến `/dashboard`.
- Trong `DashboardPage.jsx`: nếu tài khoản là `CUSTOMER`, tự động điều hướng sang `/portal`; đối với nhân viên không có quyền xem báo cáo doanh thu (`reports.view`), chỉ tải danh sách phiếu sửa chữa mà không gọi endpoint báo cáo tài chính gây lỗi 403.

## 3. Kết quả kiểm thử

- **57/57 backend unit tests PASS** (`npm test`).
- **Frontend build PASS (0 errors)**, lint 0 lỗi.
- Đã kiểm tra E2E vòng đời đăng nhập:
  - Đăng nhập Admin thành công: HTTP 200, Token hợp lệ, thời hạn 259,200 giây (72 giờ).
  - Lấy thông tin `/api/v1/auth/me` thành công: User `admin`, Role `ADMIN`, `branchId: 1`.
  - Đăng nhập sai mật khẩu: HTTP 401, thông báo chuẩn "Tên đăng nhập hoặc mật khẩu không chính xác".
  - Kiểm tra mật khẩu 6 ký tự: vượt qua validation định dạng.
  - Đăng xuất `/api/v1/auth/logout`: HTTP 204, thu hồi session thành công trong database.
  - Sử dụng lại token đã đăng xuất: HTTP 401 `INVALID_SESSION`.

