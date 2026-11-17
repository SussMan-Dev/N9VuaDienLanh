# Security
## Baseline
- HTTPS cho dữ liệu thật; mật khẩu băm bằng Argon2id hoặc bcrypt; không log mật khẩu/token.
- Xác thực mọi request riêng tư và kiểm tra quyền tại backend.
- Validate/normalize input, query tham số hóa, CORS allowlist, rate limit đăng nhập, security headers và giới hạn payload.
- Không trả stack trace, SQL hay bí mật cho client; secrets chỉ qua biến môi trường/secret manager.
- Backend giới hạn JSON request 100 KB, tắt `x-powered-by`, gắn `x-request-id` để truy vết; logging không được chứa mật khẩu hay connection string.
- Mật khẩu dùng `scrypt` với salt ngẫu nhiên; session token chỉ lưu hash SHA-256 trong database, hết hạn sau 12 giờ và có thể thu hồi khi logout.
- Login bị giới hạn 5 lần thử trong 15 phút theo IP. Rate-limit hiện là in-memory, phù hợp một process; cần thay bằng shared store trước khi chạy nhiều instance.
- Client gửi token trong `Authorization: Bearer`; không ghi token vào log hoặc commit vào file cấu hình.
- Nếu lộ mật khẩu, chạy `npm run reset:password` với `RESET_USERNAME` và `RESET_PASSWORD`; script sẽ đổi hash và thu hồi mọi session còn hiệu lực của tài khoản đó.
## Dữ liệu và kiểm toán
- Phân quyền dữ liệu khách hàng/phiếu theo vai trò.
- Truy vết actor/timestamp với trạng thái, tài chính và quản trị.
- Chốt backup, lưu giữ và khôi phục trước production.
