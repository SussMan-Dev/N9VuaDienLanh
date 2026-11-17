# TASK-013 — Quality, delivery và operations guide
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-011, TASK-012

## Mục tiêu
Hoàn thiện kiểm thử tích hợp toàn diện, kiểm tra phân quyền và các kịch bản ngoại lệ quan trọng, hoàn thiện tài liệu hướng dẫn triển khai/vận hành, thiết lập và kiểm chứng quy trình sao lưu / phục hồi (backup & restore).

## Tiêu chí nghiệm thu
- [x] Luồng E2E, quyền và kịch bản lỗi quan trọng có kết quả kiểm thử.
  - Xây dựng và thực thi thành công kịch bản kiểm thử tích hợp toàn trình E2E `backend/src/scripts/verify-e2e-delivery.js`:
    - Tiếp nhận khách hàng & thiết bị.
    - Tạo phiếu sửa chữa (RECEIVED).
    - Phân công kỹ thuật viên (Chỉ Quản lý mới được phân công, KTV không có quyền nhận lỗi 403).
    - Chuyển sang chẩn đoán (DIAGNOSING) và ghi nhận kết luận kỹ thuật.
    - Lập báo giá đa phiên bản (WAITING_APPROVAL).
    - Khách hàng duyệt báo giá (APPROVED).
    - Sửa chữa và xuất kho phụ tùng nguyên tử (REPAIRING, kiểm tra tồn kho giảm chính xác).
    - Hoàn thành sửa chữa (READY_FOR_PICKUP).
    - Kiểm tra chặn bàn giao máy khi chưa thanh toán xong (Bị từ chối HTTP 409 OVERDUE_BALANCE).
    - Ghi nhận thanh toán đủ (PAID).
    - Bàn giao máy cho khách (DELIVERED).
    - Cấp thẻ bảo hành sau sửa chữa và tra cứu theo mã bảo hành.
    - Tiếp nhận bảo hành lại (Warranty claim) liên kết mã phiếu cũ.
    - Báo cáo tổng hợp số liệu phản ánh chính xác doanh thu, công nợ, bảo hành và cảnh báo kho.
    - Dọn dẹp dữ liệu kiểm thử hoàn toàn tự động.
- [x] README có hướng dẫn chạy; quy trình backup/restore được kiểm chứng.
  - Cập nhật toàn diện `README.md` tại gốc dự án với hướng dẫn cài đặt, cấu hình `.env`, chạy Backend, chạy Frontend, tài khoản mặc định và ma trận phân quyền RBAC.
  - Tạo tài liệu vận hành chi tiết `docs/OPERATIONS.md`: Hướng dẫn triển khai, kiến trúc, cấu hình, xử lý sự cố thường gặp (troubleshooting), quy trình backup và restore.
  - Tạo scripts sao lưu & khôi phục database `database/scripts/backup.ps1` và `database/scripts/restore.ps1`.
  - Xây dựng và chạy kiểm chứng tự động quy trình phục hồi thảm họa `backend/src/scripts/verify-backup-restore.js` (tạo bảng dữ liệu, sao lưu, xóa bảng mô phỏng thảm họa, khôi phục từ backup, xác minh dữ liệu khớp 100%).
  - Cập nhật tài liệu kiểm thử `docs/TESTING.md` phản ánh mô hình kim tự tháp kiểm thử và bảng kết quả thực thi.

## Kiểm thử & Xác thực
- Backend:
  - `npm test`: 34/34 tests passing.
  - `npm run lint`: 0 lỗi cú pháp (đã kiểm tra toàn bộ 27 modules và verification scripts).
  - `npm run test:e2e`: PASSED (toàn bộ 16 bước quy trình E2E thành công).
  - `node src/scripts/verify-backup-restore.js`: PASSED (kiểm chứng khôi phục thành công).
- Frontend:
  - `npm run build`: PASSED (44 modules transformed, 0 lỗi).
