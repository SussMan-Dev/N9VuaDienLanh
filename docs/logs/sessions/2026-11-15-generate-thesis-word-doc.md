# Session Log: 2026-11-15 - Chuẩn Hóa Sơ Đồ UML Doanh Nghiệp & Mở Rộng Thư Viện Hình Ảnh Web + Mobile Trong Đồ Án Word

## 1. Mục tiêu phiên làm việc
Người dùng yêu cầu:
1. Bỏ bớt icon/emoji trong sơ đồ Use Case, vẽ lại theo chuẩn mực chính quy.
2. Thiết kế Biểu đồ lớp (UML Class Diagram) theo đúng chuẩn format mà các công ty/doanh nghiệp phần mềm sử dụng.
3. Bổ sung thêm nhiều hình ảnh giao diện thực tế cho cả Web Application và Mobile App.

## 2. Các thay đổi và tối ưu triển khai
### 2.1. Chuẩn hóa Sơ đồ Use Case theo OMG UML 2.5 (`generate-thesis-diagrams.js`)
- Loại bỏ hoàn toàn các emoji / icon không chuẩn mực.
- Sử dụng biểu tượng hình người stick-figure chuẩn UML (đầu tròn, thân, tay, chân rõ ràng).
- Use Case hình bầu dục (oval) viền đậm, font chữ chuẩn kỹ thuật, hiển thị rõ mã `UCxx` và tên ca sử dụng.
- Phân định rõ System Boundary với tiêu đề hệ thống chuẩn mực.
- Sơ đồ Phân hệ Thẩm định Báo giá 2 tầng thể hiện rõ ràng các quan hệ `«include»` và `«extend»`.

### 2.2. Biểu đồ lớp chuẩn Doanh nghiệp (Enterprise UML Class Diagram)
- Phân chia mỗi thực thể lớp thành đúng 3 ngăn theo chuẩn OMG UML 2.5:
  1. Ngăn 1: Stereotype `«Entity»` hoặc `«Aggregate Root»` + Tên lớp viết hoa (PascalCase).
  2. Ngăn 2: Danh mục thuộc tính (Attributes) có phạm vi truy cập private `-`, tên thuộc tính và kiểu dữ liệu chuẩn doanh nghiệp (`Long`, `String`, `BigDecimal`, `LocalDateTime`, `Boolean`, `Enum`).
  3. Ngăn 3: Danh mục phương thức (Operations) có phạm vi truy cập public `+`, tham số truyền vào và kiểu trả về rõ ràng.
- Bổ sung bảng chú giải quy chuẩn quan hệ với ký hiệu kết tập mạnh Composition hình thoi đặc `◆` (RepairOrder và Quote, QuoteItem, RepairLog) và quan hệ liên kết Association có chỉ định rõ bậc quan hệ (`1 ── 0..*`, `1 ── 1..*`, `1 ── 0..1`).

### 2.3. Mở rộng thư viện hình ảnh giao diện Web & Mobile (`generate-thesis-screenshots.js`)
- **Giao diện Web (9 hình ảnh thực tế)**:
  - Hình 4.1: Trang Landing Page & Hộp thoại Đăng nhập
  - Hình 4.2: Admin Dashboard KPI trung tâm
  - Hình 4.3: Quản lý danh sách phiếu sửa chữa đa trạng thái & bộ lọc
  - Hình 4.4: Chi tiết phiếu sửa chữa, thẩm định báo giá & nhật ký
  - Hình 4.5: Quản lý kho vật tư, cảnh báo tồn kho & cấp phát
  - Hình 4.6: Quản trị khách hàng & hồ sơ thiết bị
  - Hình 4.7: Cổng Dịch vụ Khách hàng trực tuyến (Customer Portal)
  - Hình 4.8: Mẫu Hóa đơn thanh toán chuẩn doanh nghiệp & In PDF
  - Hình 4.9: Phân hệ Báo cáo vận hành & Phân tích KPI doanh thu / công nợ
- **Giao diện Mobile App (12 hình ảnh trong khung iPhone 15 Pro Titanium)**:
  - Hình 4.10: Đăng nhập Vua Sửa Chữa trên Mobile
  - Hình 4.11: Đăng ký tài khoản Khách hàng mới
  - Hình 4.12: Dashboard Admin & Phân công KTV theo tên trực quan
  - Hình 4.13: Danh sách đơn nhận việc của KTV (2 tab: Đơn của tôi & Tất cả đơn)
  - Hình 4.14: Chi tiết đơn KTV với Stepper 4 bước & Nút Gọi/Chỉ đường
  - Hình 4.15: KTV Lập dự toán báo giá chi phí trên Mobile
  - Hình 4.16: KTV Chụp ảnh nhật ký Trước & Sau khi sửa chữa
  - Hình 4.17: Cổng Dịch vụ Khách hàng & Danh mục máy
  - Hình 4.18: Khách hàng Đặt lịch sửa chữa tại nhà
  - Hình 4.19: Theo dõi tiến trình 10 giai đoạn thời gian thực
  - Hình 4.20: Phân hệ Thủ kho thẩm định & duyệt xuất vật tư trên Mobile
  - Hình 4.21: Phân hệ Kế toán thu tiền & quyết toán hóa đơn trên Mobile

### 2.4. Kết xuất File Word Đồ Án Mới (`generate-thesis-docx.js`)
- Tích hợp toàn bộ 6 biểu đồ UML chuẩn hóa và 21 hình ảnh giao diện Web & Mobile.
- File Word: `docs/dist/DO_AN_TOT_NGHIEP_VUA_SUA_CHUA.docx` (Dung lượng: 4.63 MB).
- Lệnh tạo lại tự động: `npm run thesis:generate`.
