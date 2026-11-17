# TASK-M01 — Khởi tạo Nền tảng Mobile App & Authentication Đa vai trò (Giai đoạn 1)
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Người thực hiện:** AI Assistant
- **Phụ thuộc:** TASK-R06
- **Giai đoạn:** Phase M — Giai đoạn 1 (Nền tảng & Xác thực)

## Mục tiêu
Khởi tạo cấu trúc ứng dụng di động `mobile/` bằng React Native và Expo (TypeScript), xây dựng tầng giao tiếp REST API, quản lý token JWT bằng hardware-backed storage (`expo-secure-store`), hỗ trợ xác thực sinh trắc học Face ID / Vân tay (`expo-local-authentication`), và thiết lập bộ điều hướng phân tầng tự động theo 6 vai trò người dùng (`primaryRole`).

## Phạm vi
- Khởi tạo Expo SDK 58 (blank-typescript).
- Cấu hình file `app.json` (Bundle ID `com.dienmaypro.app`, icon, quyền camera/storage/biometrics, API base URL).
- Cài đặt hệ thống Navigation: Native Stack và Bottom Tabs.
- Xây dựng HTTP Client (`mobile/src/api/client.ts`) dùng Axios, đính kèm Bearer token và interceptor xử lý 401.
- Xây dựng `AuthContext` và `SecureTokenStore` hỗ trợ lưu token an toàn, ghi nhớ tên đăng nhập và đăng nhập bằng sinh trắc học.
- Màn hình `LoginScreen`: Form đăng nhập hoàn chỉnh với giao diện hiện đại, nút ẩn/hiện mật khẩu, checkbox ghi nhớ tài khoản và nút FaceID/Vân tay.
- Màn hình `ProfileScreen`: Hiển thị thông tin người dùng, vai trò và nút đăng xuất có xác nhận.
- Điều hướng gốc `RootNavigator`: Tự động phân luồng khách hàng vào `CustomerTabs`, KTV vào `TechnicianTabs`, Admin vào `AdminStack`.

## Không thuộc phạm vi
- Tích hợp Push Notification FCM (thuộc Giai đoạn 3).
- Chụp ảnh camera native và upload trực tiếp lên cloud storage (thuộc Giai đoạn 2).

## File đã thay đổi / tạo mới
- `mobile/package.json`
- `mobile/app.json`
- `mobile/App.tsx`
- `mobile/src/api/client.ts`
- `mobile/src/api/auth.ts`
- `mobile/src/api/repairs.ts`
- `mobile/src/api/repair-logs.ts`
- `mobile/src/api/customer-portal.ts`
- `mobile/src/auth/SecureTokenStore.ts`
- `mobile/src/auth/AuthContext.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/navigation/TechnicianTabs.tsx`
- `mobile/src/navigation/CustomerTabs.tsx`
- `mobile/src/navigation/AdminStack.tsx`
- `mobile/src/screens/auth/LoginScreen.tsx`
- `mobile/src/screens/common/ProfileScreen.tsx`
- `mobile/src/screens/technician/WorkOrderListScreen.tsx`
- `mobile/src/screens/customer/CustomerOrderListScreen.tsx`
- `mobile/src/screens/customer/OrderTrackingScreen.tsx`
- `mobile/src/screens/customer/WarrantyScreen.tsx`
- `mobile/src/screens/admin/AdminDashboardScreen.tsx`
- `mobile/src/screens/admin/QuoteApprovalScreen.tsx`
- `mobile/src/utils/formatCurrency.ts`
- `mobile/src/utils/formatDate.ts`
- `mobile/src/utils/repairStatus.ts`

## Rủi ro và giả định
- Thiết bị thật kết nối mạng nội bộ cần trỏ `API_BASE_URL` về địa chỉ IP LAN của máy chủ thay vì `10.0.2.2` (Android emulator) hay `localhost`.
- Hermes JavaScript engine được kích hoạt mặc định trong Expo để tối ưu tốc độ khởi động và hỗ trợ `Intl.NumberFormat`.

## Yêu cầu kỹ thuật / nghiệp vụ
- 100% mã nguồn TypeScript, không dùng `any` bừa bãi, không có lỗi type-check.
- Token JWT không được lưu trong `AsyncStorage` thường mà bắt buộc dùng `expo-secure-store` để chống trích xuất dữ liệu trên thiết bị đã root/jailbreak.
- Giao diện đáp ứng tốt cả màn hình tai thỏ (Notch / Dynamic Island) qua `SafeAreaProvider`.

## Tiêu chí nghiệm thu
- [x] Dự án Expo TypeScript khởi tạo hoàn chỉnh, không xung đột package.
- [x] Màn hình đăng nhập hoạt động tốt, hiển thị lỗi rõ ràng khi sai thông tin.
- [x] Token lưu và xóa an toàn trong `SecureStore`.
- [x] Đăng nhập tự động phân loại đúng luồng giao diện theo vai trò (Customer / KTV / Admin).
- [x] `tsc --noEmit` hoàn tất với 0 lỗi cảnh báo hoặc biên dịch.

## Kiểm thử
| Ngày | Lệnh/kịch bản | Kết quả | Ghi chú |
| --- | --- | --- | --- |
| 2026-11-14 | `npx create-expo-app mobile --template blank-typescript` | PASS | Khởi tạo thành công Expo 58 |
| 2026-11-14 | `npm install @react-navigation/... expo-secure-store ...` | PASS | Cài đặt 8 core packages thành công |
| 2026-11-14 | `npx tsc --noEmit` trong thư mục `mobile/` | PASS | **0 lỗi biên dịch TypeScript (100% type-safe)** |

## Kết quả bàn giao
- Toàn bộ khung ứng dụng di động `mobile/` hoàn thiện nền tảng và chức năng xác thực.
- Tài liệu kiến trúc `docs/MOBILE_ARCHITECTURE.md`.

## Vấn đề còn tồn tại
- Cần cấu hình địa chỉ IP máy tính khi mang ứng dụng ra kiểm thử trên thiết bị di động vật lý.

## Tài liệu đã cập nhật
- `docs/MOBILE_ARCHITECTURE.md`
- `docs/tasks/README.md`
- `docs/logs/WORKLOG.md`
- `docs/logs/sessions/2026-11-14-init-mobile-app-and-docs.md`

## Liên kết
- Session log: `docs/logs/sessions/2026-11-14-init-mobile-app-and-docs.md`
- Kiến trúc di động: `docs/MOBILE_ARCHITECTURE.md`
