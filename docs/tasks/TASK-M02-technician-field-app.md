# TASK-M02 — Trải nghiệm Kỹ thuật viên Hiện trường (Field Tech App) (Giai đoạn 2)
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Người thực hiện:** AI Assistant
- **Phụ thuộc:** TASK-M01
- **Giai đoạn:** Phase M — Giai đoạn 2 (App Kỹ thuật viên)

## Mục tiêu
Xây dựng toàn bộ giao diện và luồng thao tác dành cho Kỹ thuật viên hiện trường (Field Technicians) trên điện thoại: tiếp nhận đơn phân công, chỉ đường tới nhà khách qua Google Maps, gọi điện nhanh, ghi nhận chẩn đoán lỗi, chụp 2-4 ảnh hiện trạng trước/sau khi sửa, lập báo giá trực tiếp tại hiện trường và gửi yêu cầu cấp phát linh kiện từ kho.

## Phạm vi
1. **Màn hình Danh sách Đơn được giao (`WorkOrderListScreen`)**:
   - Tự động lọc các đơn có `assignedTechnicianId = user.id`.
   - Phân loại theo tab trạng thái: `Được giao (ASSIGNED)`, `Đang sửa (IN_PROGRESS)`, `Chờ linh kiện (WAITING_PARTS)`.
   - Tìm kiếm nhanh theo mã đơn hoặc tên khách hàng.
2. **Màn hình Chi tiết Phiếu Sửa Chữa (`WorkOrderDetailScreen`)**:
   - Thông tin thiết bị: Tên máy, dòng máy, số serial, mô tả hiện tượng hỏng từ khách.
   - Nút gọi điện trực tiếp (`Linking.openURL('tel:...')`) đến số điện thoại khách hàng.
   - Nút dẫn đường (`Linking.openURL('https://maps.google.com/...')`) mở ứng dụng bản đồ chỉ đường đến địa chỉ nhà khách.
   - Nút bấm chuyển trạng thái: `Bắt đầu chẩn đoán` (GĐ 4) ➔ `Lập báo giá` (GĐ 5).
3. **Màn hình Chụp ảnh & Ghi nhật ký Hiện trạng (`CameraLogScreen`)**:
   - Sử dụng `expo-image-picker` để chụp ảnh trực tiếp từ camera điện thoại hoặc chọn từ thư viện.
   - Nén ảnh tự động chất lượng 60% và đính kèm Base64/URI.
   - Phân loại rõ ràng: Ảnh trước khi tháo máy (`imagesBefore`) và Ảnh sau khi sửa xong (`imagesAfter`).
   - Nhập nội dung công việc đã thực hiện, lưu vào bảng `repair_logs`.
4. **Lập Báo giá & Yêu cầu Linh kiện Kho**:
   - Màn hình `QuoteBuilderScreen`: Chọn nhanh linh kiện từ danh mục kho hàng (`listInventoryItems`) hoặc nhập thủ công, tự động tính tổng tiền công + tiền linh kiện.
   - Hỗ trợ Báo giá bổ sung (`is_supplemental = 1`) khi phát sinh lỗi mới.
   - Màn hình `PartsRequestScreen`: Chọn linh kiện, số lượng cần cấp, gửi yêu cầu kho (`parts_requests`) để chuyển đơn sang `WAITING_PARTS`.

## Không thuộc phạm vi
- Khách hàng duyệt báo giá (thuộc Giai đoạn 3).
- Admin thẩm định báo giá (thuộc Giai đoạn 4).

## File đã thay đổi / tạo mới
- `mobile/src/screens/technician/WorkOrderDetailScreen.tsx`
- `mobile/src/screens/technician/CameraLogScreen.tsx`
- `mobile/src/screens/technician/QuoteBuilderScreen.tsx`
- `mobile/src/screens/technician/PartsRequestScreen.tsx`
- `mobile/src/navigation/TechnicianTabs.tsx`
- `mobile/src/api/repairs.ts`
- `mobile/src/api/inventory.ts`
- `mobile/src/api/parts-requests.ts`

## Rủi ro và giả định
- Thiết bị của thợ cần cấp quyền truy cập Camera và Vị trí (GPS).
- File ảnh chụp dung lượng lớn được nén tự động trên client (kích thước tối ưu) trước khi gửi.

## Tiêu chí nghiệm thu
- [x] KTV đăng nhập chỉ nhìn thấy các đơn được phân công cho chính mình.
- [x] Bấm vào số điện thoại khách hàng tự động mở màn hình gọi điện thoại của máy (`tel:`).
- [x] Bấm địa chỉ tự động mở Google Maps / Apple Maps chỉ đường chuẩn xác.
- [x] Chụp ảnh trước/sau và gửi nhật ký thành công lên API `POST /repair-orders/:id/logs`.
- [x] Tạo báo giá thành công, đưa đơn sang trạng thái `AWAITING_ADMIN_APPROVAL` (GĐ 5).
- [x] Tạo yêu cầu linh kiện thành công, đưa đơn sang `WAITING_PARTS` (GĐ 8).
- [x] Kiểm tra biên dịch TypeScript `tsc --noEmit` đạt 0 lỗi (100% type-safe).

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-11-14 | Cài đặt `expo-image-picker` SDK 58 | PASS | Cài đặt thành công |
| 2026-11-14 | `npx tsc --noEmit` trong thư mục `mobile/` | PASS | **0 lỗi biên dịch TypeScript (100% type-safe)** |
| 2026-11-14 | Backend 63 unit tests | PASS | 63/63 tests PASS |

## Kết quả bàn giao
- Toàn bộ trải nghiệm Kỹ thuật viên hiện trường (Field Tech App) hoàn chỉnh trên mobile.
- 4 màn hình chuyên biệt KTV: `WorkOrderDetailScreen`, `CameraLogScreen`, `QuoteBuilderScreen`, `PartsRequestScreen`.

## Tài liệu đã cập nhật
- `docs/MOBILE_ARCHITECTURE.md`
- `docs/tasks/README.md`
- `docs/logs/WORKLOG.md`
- `docs/logs/sessions/2026-11-14-technician-field-app.md`
