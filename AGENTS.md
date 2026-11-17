# Quy ước làm việc cho AI
## Thứ tự ưu tiên
1. Mỗi phiên: đọc `AGENTS.md`, `docs/tasks/README.md`, `docs/logs/WORKLOG.md`, task liên quan và kiểm tra Git status.
2. Đọc các task phụ thuộc, mã nguồn hiện có, rủi ro và tiêu chí nghiệm thu trước khi thay đổi.
3. Chỉ thực hiện một task đã chọn trong mỗi lượt, trừ khi người dùng cho phép tiếp tục.
4. Chạy kiểm thử phù hợp, ghi kết quả vào task, rồi mới hoàn thành.
## Kỷ luật tài liệu
- `docs/tasks/` ghi backlog, yêu cầu, trạng thái và nghiệm thu.
- `docs/logs/WORKLOG.md` chỉ tóm tắt việc AI đã làm.
- `docs/DECISIONS.md` chỉ ghi quyết định kiến trúc, lý do và đánh đổi.
- `docs/logs/sessions/` ghi chi tiết phiên làm việc; không ghi bí mật hay dữ liệu cá nhân.
- Không gộp ba loại thông tin trên vào cùng một file.
## Quy tắc triển khai
- Mọi thay đổi schema phải có migration mới có thứ tự; không sửa migration đã áp dụng ở môi trường chia sẻ.
- Thay đổi API/schema/quy tắc nghiệp vụ phải cập nhật lần lượt `API_SPEC.md`, `DATABASE.md`, `BUSINESS_RULES.md`.
- Dùng UTC nội bộ; frontend hiển thị theo múi giờ người dùng.
- Không commit secret, file môi trường, dump database hoặc thư mục phụ thuộc.
- Không tự ý ghi đè thay đổi ngoài task.
- Không tự tạo commit, push, pull request, reset, clean, rebase hoặc force-push.
- Khi thiếu thông tin không chặn công việc, chọn phương án an toàn/đơn giản và ghi giả định; khi ảnh hưởng lớn, dừng để hỏi người dùng.
## Definition of Done
- Tiêu chí nghiệm thu đạt, kiểm thử liên quan đã chạy, tài liệu đã cập nhật và không còn lỗi nghiêm trọng đã biết do thay đổi.
- Cập nhật `WORKLOG.md` và session log.
