# Session Log: 2026-11-01 — Fix Login Rate Limit & Admin Password

## Bối cảnh & Mục tiêu
- **Phản hồi người dùng**: Đăng nhập liên tục bị báo lỗi: `Too many login attempts; try again later`.
- **Mục tiêu**:
  - Xác định nguyên nhân kích hoạt rate-limit và khắc phục triệt để.
  - Đảm bảo tài khoản quản trị `admin` đăng nhập thành công với thông tin chuẩn trong tài liệu.

## Nguyên nhân gốc rễ (Root Cause)
1. **Lệch mật khẩu người dùng**:
   - Mật khẩu lưu trữ trong bảng `users` cho tài khoản `admin` trước đó không khớp với mật khẩu tài liệu chuẩn `Admin@12345678` (kết quả verify `verifyPassword` trả về `false`).
2. **Khóa IP do Rate Limiting quá ngặt**:
   - `loginRateLimit` trong `backend/src/middleware/login-rate-limit.js` cố định cứng `maximumAttempts = 5` trong cửa sổ `15 phút`.
   - Khi người dùng nhập sai 5 lần, IP `127.0.0.1` / `::1` bị đưa vào danh sách chặn trong 15 phút.
   - Do `clearLoginAttempts` chỉ được gọi sau khi xác thực thành công, nhưng mọi request khi đã bị chặn (count >= 5) đều bị `429 Too many login attempts` từ chối trước khi đến bước kiểm tra mật khẩu, dẫn đến người dùng bị kẹt hoàn toàn kể cả khi sau đó nhập đúng mật khẩu.

## Các thay đổi đã thực hiện
1. **Khôi phục mật khẩu tài khoản Admin chuẩn**:
   - Chạy script `node src/scripts/reset-password.js` đặt lại mật khẩu cho tài khoản `admin` thành `Admin@12345678`.
   - Xác minh qua script test: `verifyPassword('Admin@12345678', hash)` trả về `true`.
2. **Cải tiến Middleware Rate Limit (`backend/src/middleware/login-rate-limit.js`)**:
   - Hỗ trợ cấu hình động qua biến môi trường `LOGIN_MAX_ATTEMPTS` và `LOGIN_RATE_WINDOW_MINUTES`.
   - Trong môi trường `development`, tự động nâng ngưỡng cho phép lên 50 lần thử và cửa sổ trượt giảm xuống 1 phút, tránh chặn quá mức quá trình phát triển/kiểm thử cục bộ.
   - Hàm `clearLoginAttempts` hỗ trợ xóa sạch `attempts` khi cần reset.
3. **Khởi động lại Backend Server**:
   - Tắt process cũ bị lưu vết IP `::1` trong bộ nhớ, khởi động lại server backend sạch sẽ trên cổng 3000.
   - Kiểm tra API trực tiếp qua `POST /api/v1/auth/login` với `{ username: "admin", password: "Admin@12345678" }`: trả về HTTP 200 kèm Bearer token thành công ngay lập tức.

## Kết quả kiểm thử
- `cd backend && npm run lint`: 0 errors.
- `cd backend && npm test`: 34/34 tests PASS.
- `POST http://localhost:3000/api/v1/auth/login`: Trả về Bearer token hợp lệ, không còn gặp lỗi 429.

