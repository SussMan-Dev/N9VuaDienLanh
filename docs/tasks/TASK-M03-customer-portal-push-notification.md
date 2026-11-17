# TASK-M03 — Cổng Khách Hàng Mobile & Thông Báo Đẩy FCM (Giai đoạn 3)
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Người thực hiện:** AI Assistant
- **Phụ thuộc:** TASK-M01
- **Giai đoạn:** Phase M — Giai đoạn 3 (App Khách hàng & Push Notification)

## Mục tiêu
Triển khai toàn bộ trải nghiệm cho khách hàng sử dụng dịch vụ trên ứng dụng di động: đặt lịch sửa chữa thiết bị tại nhà, theo dõi tiến trình 10 giai đoạn thời gian thực, nhận thông báo đẩy tức thì (Push Notification) khi có báo giá cần duyệt, duyệt/từ chối báo giá 1 chạm, tra cứu thẻ bảo hành điện tử; đồng thời xây dựng hạ tầng Push Notification Firebase Cloud Messaging (FCM) ở phía Backend.

## Phạm vi
1. **Màn hình Đặt lịch Sửa chữa (`CreateBookingScreen`)**:
   - Chọn loại thiết bị (Máy giặt, Tủ lạnh, Điều hòa, Lò vi sóng...).
   - Chụp ảnh hoặc chọn ảnh thiết bị hỏng đính kèm.
   - Nhập mô tả triệu chứng hư hỏng.
   - Chọn khung giờ mong muốn hẹn thợ đến tận nhà (`preferredDatetime`).
   - Gửi yêu cầu lên `POST /api/v1/customer/service-requests`, tạo đơn ở trạng thái `PENDING` (GĐ 1).
2. **Theo dõi Tiến trình 10 Giai đoạn (`OrderTrackingScreen`)**:
   - Timeline trực quan đánh dấu tiến độ từ `Tiếp nhận` ➔ `Chẩn đoán` ➔ `Báo giá` ➔ `Đang sửa` ➔ `Hoàn thành`.
   - Xem thông tin KTV đang phụ trách (Họ tên, số điện thoại liên hệ).
   - Hiển thị bảng chi phí và công nợ thời gian thực.
3. **Phê duyệt Báo giá Trực tuyến 1 chạm**:
   - Bảng hiển thị chi tiết báo giá đã được Admin thẩm định (Tiền công + từng linh kiện).
   - Cờ cảnh báo nếu là Báo giá bổ sung (`is_supplemental`).
   - Nút **"✅ Đồng ý sửa"**: Chuyển phiếu sang `APPROVED` (GĐ 6), cho phép KTV bắt đầu sửa.
   - Nút **"❌ Từ chối"**: Bắt buộc nhập lý do phản hồi lại cho cửa hàng (hỗ trợ Modal tương thích Android/iOS).
4. **Ví Thẻ Bảo hành Điện tử (`WarrantyScreen`)**:
   - Danh sách thẻ bảo hành điện tử còn hiệu lực và đã hết hạn.
   - Mã thẻ `WAR-XXXX`, thời hạn bắt đầu/kết thúc, điều khoản bảo hành.
   - Endpoint `GET /api/v1/customer/warranties` trả về danh sách bảo hành kèm thông tin thiết bị.
5. **Hạ tầng Backend Push Notification (FCM / Expo Push)**:
   - Migration tạo bảng `user_device_tokens (user_id, token, device_type, last_used_at)`.
   - API đăng ký/hủy token: `POST` & `DELETE` `/api/v1/notifications/device-token`.
   - Module `notification-service.js` gửi thông báo tự động khi:
     * KTV được phân công (`ASSIGNED`).
     * Admin duyệt báo giá, chuyển sang khách duyệt (`AWAITING_CUSTOMER_APPROVAL`).
     * KTV tạo báo giá mới gửi Admin (`AWAITING_ADMIN_APPROVAL`).
     * Khách hàng chấp thuận hoặc từ chối báo giá (`APPROVED` / `REJECTED`).

## Không thuộc phạm vi
- Thanh toán trực tuyến cổng VNPAY/MoMo (tạm thời ghi nhận thanh toán tiền mặt/chuyển khoản qua Kế toán).

## File đã thay đổi / tạo mới
- Backend:
  - `backend/src/routes/notifications.js`
  - `backend/src/services/notification-service.js`
  - `database/migrations/202611140001_user_device_tokens.sql`
  - `backend/src/services/workflow-service.js` (tích hợp notify trigger)
  - `backend/src/routes/customer-portal.js` (`GET /api/v1/customer/warranties`)
  - `backend/src/services/customer-portal-service.js` (`listCustomerWarranties`)
- Mobile:
  - `mobile/src/screens/customer/CreateBookingScreen.tsx`
  - `mobile/src/screens/customer/OrderTrackingScreen.tsx` (thay Alert.prompt bằng Modal)
  - `mobile/src/screens/customer/WarrantyScreen.tsx`
  - `mobile/src/services/notification-service.ts` (Expo Notifications)
  - `mobile/src/auth/AuthContext.tsx` (tự động đăng ký token khi login, hủy khi logout)
  - `mobile/app.json` (bổ sung plugin `expo-notifications`)

## Tiêu chí nghiệm thu
- [x] Khách hàng đặt lịch thành công, hệ thống tạo Ticket `PENDING` và hiển thị trên Web lễ tân.
- [x] Khi KTV lập báo giá và Admin duyệt, điện thoại của khách lập tức nhận được Push Notification.
- [x] Khách bấm duyệt báo giá trên App, trạng thái đơn trên cả App và Web lập tức chuyển sang `APPROVED`.
- [x] Danh sách thẻ bảo hành hiển thị đầy đủ, phân biệt rõ màu xanh (còn hạn) và màu xám (hết hạn).

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-11-15 | `node --env-file=.env src/scripts/verify-mobile-e2e.js` | PASS 100% (12/12 bước) | Kịch bản trọn vẹn từ đặt lịch đến bảo hành |
| 2026-11-15 | `cd mobile && npx tsc --noEmit` | PASS (0 lỗi) | Type safety 100% |
| 2026-11-15 | `npm test --prefix backend` | PASS 63/63 | Không hồi quy hệ thống |

## Tài liệu đã cập nhật
- `docs/MOBILE_ARCHITECTURE.md`
- `docs/tasks/README.md`
- `docs/logs/WORKLOG.md`
