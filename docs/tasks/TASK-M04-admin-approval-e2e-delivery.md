# TASK-M04 — Admin Thẩm Định, Kiểm Thử E2E Liên Thông & Đóng Gói Build (Giai đoạn 4)
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Người thực hiện:** AI Assistant
- **Phụ thuộc:** TASK-M02, TASK-M03
- **Giai đoạn:** Phase M — Giai đoạn 4 (Admin Thẩm định & Hoàn thiện E2E)

## Mục tiêu
Hoàn thiện giao diện dành cho Admin/Quản lý trên Mobile để thẩm định phê duyệt báo giá (Tầng 1 Admin Approval) khi di chuyển bên ngoài; thực hiện kiểm thử tích hợp E2E toàn luồng liên thông giữa Web Portal và Mobile App; thiết lập cấu hình đóng gói phát hành file cài đặt Android APK và chuẩn bị phát hành iOS qua TestFlight.

## Phạm vi
1. **Giao diện Thẩm định Báo giá Tầng 1 (`QuoteApprovalScreen`)**:
   - Danh sách các phiếu đang ở trạng thái `AWAITING_ADMIN_APPROVAL` (GĐ 5).
   - Xem chi tiết từng món linh kiện, đơn giá, tiền công do KTV đề xuất.
   - Nút **"✓ Duyệt gửi khách"**: Gọi `POST /repair-orders/:id/quotes/:quoteId/admin-approval` với `decision: 'APPROVED'`, tự động kích hoạt chuyển đơn sang `AWAITING_CUSTOMER_APPROVAL` (GĐ 6) và gửi thông báo cho khách.
   - Nút **"✕ Yêu cầu sửa"**: Bắt buộc nhập lý do, trả báo giá về cho KTV kèm ghi chú.
2. **Dashboard Điều Hành Nhanh cho Admin (`AdminDashboardScreen`)**:
   - Đếm số đơn đang ở từng giai đoạn (báo giá chờ duyệt, cảnh báo KPI).
   - Truy cập nhanh màn hình thẩm định báo giá chi tiết.
3. **Kịch bản Kiểm thử Tích hợp E2E Liên thông (Web ↔ Mobile)**:
   - Bước 1: Tạo tài khoản 5 vai trò và đăng ký push token.
   - Bước 2: Khách hàng đặt lịch sửa trên **Mobile App** ➔ Trạng thái `PENDING`.
   - Bước 3: Lễ tân tiếp nhận đơn trên **Web Portal** ➔ Trạng thái `ACCEPTED`.
   - Bước 4: Quản lý phân công KTV ➔ Trạng thái `ASSIGNED` & gửi Push Notification tới KTV.
   - Bước 5: KTV lập nhật ký sửa chữa đính kèm ảnh hiện trạng trước sửa chữa.
   - Bước 6: KTV lập báo giá trên **Mobile App** ➔ Trạng thái `AWAITING_ADMIN_APPROVAL` & thông báo cho Admin.
   - Bước 7: Admin mở **Mobile App** thẩm định và bấm Phê duyệt ➔ Trạng thái `AWAITING_CUSTOMER_APPROVAL` & thông báo cho Khách.
   - Bước 8: Khách hàng nhận Push Notification trên **Mobile App**, bấm "Đồng ý sửa" ➔ Trạng thái `APPROVED`.
   - Bước 9: KTV tiến hành sửa máy và bấm "Hoàn tất" ➔ Trạng thái `COMPLETED`.
   - Bước 10: Kế toán trên **Web Portal** lập hóa đơn và thu tiền đủ 100% ➔ Trạng thái `PAID`.
   - Bước 11: Thiết bị được bàn giao cho khách (`DELIVERED`), hệ thống kích hoạt bảo hành điện tử.
   - Bước 12: Khách hàng tra cứu thẻ bảo hành điện tử trực tiếp trên **Mobile App** (`GET /api/v1/customer/warranties`).
4. **Đóng gói Cài đặt & Phát hành**:
   - Cấu hình `eas.json` hoàn chỉnh với các profile `development`, `preview` (APK độc lập cho Android) và `production` (Google Play App Bundle).
   - Tài liệu cẩm nang vận hành và hướng dẫn build APK chi tiết trong `docs/MOBILE_ARCHITECTURE.md`.

## Không thuộc phạm vi
- Xuất bản trực tiếp lên Google Play Store và Apple App Store (cần tài khoản developer thương mại của doanh nghiệp).

## File đã thay đổi / tạo mới
- `mobile/eas.json` (Cấu hình build EAS Application Services)
- `backend/src/scripts/verify-mobile-e2e.js` (Script kiểm thử E2E liên thông 12 bước)
- `mobile/src/screens/admin/AdminDashboardScreen.tsx`
- `mobile/src/screens/admin/QuoteApprovalScreen.tsx`

## Tiêu chí nghiệm thu
- [x] Admin duyệt hoặc từ chối báo giá tầng 1 mượt mà ngay trên điện thoại di động.
- [x] Kịch bản E2E 12 bước liên thông giữa Web và Mobile chạy thành công 100% không gặp lỗi phân quyền hoặc dữ liệu.
- [x] Cấu hình `eas.json` sẵn sàng biên dịch file APK để cài đặt và chạy trực tiếp trên thiết bị Android thật.

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-11-15 | `node --env-file=.env src/scripts/verify-mobile-e2e.js` | PASS 100% (12/12 bước) | Kiểm thử liên thông toàn bộ 10 giai đoạn |
| 2026-11-15 | `cd mobile && npx tsc --noEmit` | PASS (0 lỗi) | 100% Type-safe |
| 2026-11-15 | `npm test --prefix backend` | PASS 63/63 | Toàn bộ unit tests đạt chuẩn |

## Tài liệu đã cập nhật
- `docs/MOBILE_ARCHITECTURE.md`
- `docs/tasks/README.md`
- `docs/logs/WORKLOG.md`
