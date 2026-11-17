# Business Rules — Hệ thống 6 Roles & Quy trình 10 Giai đoạn chuẩn

## 1. Trạng thái phiếu sửa chữa (10 Giai đoạn chuẩn)
- `PENDING`: Giai đoạn 1 — Chờ lễ tân tiếp nhận (đơn do khách hàng tự tạo online hoặc lễ tân tạo hộ).
- `ACCEPTED`: Giai đoạn 2 — Lễ tân đã tiếp nhận và xác thực thông tin, chờ Admin phân công.
- `REJECTED`: Giai đoạn 2 — Lễ tân từ chối đơn sửa chữa (bắt buộc ghi rõ lý do từ chối).
- `ASSIGNED`: Giai đoạn 3 — Admin đã phân công kỹ thuật viên phụ trách.
- `DIAGNOSING`: Giai đoạn 4 — Kỹ thuật viên kiểm tra thiết bị và chẩn đoán lỗi.
- `AWAITING_ADMIN_APPROVAL`: Giai đoạn 4 — KTV đã lập báo giá, chờ Admin thẩm định và phê duyệt.
- `AWAITING_CUSTOMER_APPROVAL`: Giai đoạn 5 — Admin đã duyệt báo giá, chờ khách hàng xác nhận.
- `APPROVED`: Giai đoạn 6 — Khách hàng đồng ý báo giá, cho phép bắt đầu sửa chữa.
- `IN_PROGRESS`: Giai đoạn 7 — Kỹ thuật viên đang thực hiện sửa chữa và ghi nhật ký có ảnh.
- `WAITING_PARTS`: Giai đoạn 8 — Chờ Thủ kho phê duyệt & xuất kho linh kiện cấp phát.
- `COMPLETED`: Giai đoạn 9 — KTV hoàn thành sửa chữa, chờ Kế toán lập hóa đơn và thanh toán.
- `PAID`: Giai đoạn 10 — Kế toán đã ghi nhận thanh toán đủ 100% chi phí.
- `DELIVERED`: Thiết bị đã bàn giao xong cho khách hàng.
- `CANCELLED`: Đã hủy đơn.
- `UNREPAIRABLE`: Thiết bị không thể phục hồi hoặc khách từ chối sửa.

## 2. Quy trình nghiệp vụ 10 Giai đoạn chuẩn
1. **Giai đoạn 1: Tạo yêu cầu sửa chữa**: Khách hàng tạo online hoặc Lễ tân tạo hộ. Nhập liên hệ, địa chỉ, thiết bị, tình trạng hỏng, hình ảnh. Phiếu khởi tạo ở `PENDING`.
2. **Giai đoạn 2: Lễ tân tiếp nhận**: Lễ tân kiểm tra thông tin. Chấp nhận chuyển sang `ACCEPTED`; từ chối chuyển sang `REJECTED` (bắt buộc nhập lý do).
3. **Giai đoạn 3: Admin phân công kỹ thuật viên**: Admin chọn KTV phù hợp giao phiếu. Phiếu chuyển sang `ASSIGNED`.
4. **Giai đoạn 4: Kỹ thuật viên chẩn đoán và lập báo giá**: KTV kiểm tra thiết bị, đề xuất phương án và lập báo giá gửi Admin. Phiếu chuyển sang `AWAITING_ADMIN_APPROVAL`.
5. **Giai đoạn 5: Admin duyệt chẩn đoán và báo giá**: Admin kiểm tra chi phí và phương án. Duyệt đưa phiếu sang `AWAITING_CUSTOMER_APPROVAL`; từ chối yêu cầu KTV sửa lại đưa về `ASSIGNED`.
6. **Giai đoạn 6: Khách hàng xác nhận báo giá**: Khách duyệt trên Cổng khách hàng (hoặc qua điện thoại). Duyệt chuyển sang `APPROVED`; từ chối chuyển sang `CANCELLED`. Chỉ khi khách đồng ý KTV mới được sửa (`409 APPROVED_QUOTE_REQUIRED`).
7. **Giai đoạn 7: Kỹ thuật viên thực hiện sửa chữa**: KTV bấm Bắt đầu sửa chữa (`IN_PROGRESS`), ghi nhật ký từng lần kèm hình ảnh trước/sau sửa chữa.
8. **Giai đoạn 8: Yêu cầu linh kiện từ kho**: KTV tạo yêu cầu linh kiện, phiếu chuyển sang `WAITING_PARTS`. Thủ kho duyệt/từ chối. Khi xuất kho thực tế (`ISSUED`), trừ kho nguyên tử và chuyển về `IN_PROGRESS`. Nếu phát sinh chi phí, KTV lập Báo giá bổ sung qua 2 tầng duyệt Admin -> Khách hàng; không tự động cộng nợ của khách.
9. **Giai đoạn 9: Hoàn thành sửa chữa**: KTV hoàn tất công việc, chụp ảnh sau sửa chữa và chuyển sang `COMPLETED`. Kế toán nhận thông báo tiếp nhận phiếu.
10. **Giai đoạn 10: Kế toán lập hóa đơn & thanh toán**: Kế toán kiểm tra tổng chi phí và các khoản đã duyệt, lập hóa đơn (`INV-...`) và ghi nhận thanh toán. Khi thanh toán đủ 100% (`balance <= 0`), hệ thống tự động chuyển sang `PAID` và lưu `paid_at`. Sau khi `PAID`, nhân viên bàn giao thiết bị (`DELIVERED`).

## 3. Phân quyền người dùng (6 Vai trò - 6 Roles)
- **Admin**: Quản lý toàn bộ hệ thống, tài khoản, phân quyền, phân công KTV, duyệt kết quả chẩn đoán/báo giá, theo dõi tiến độ và hoạt động các bộ phận.
- **Lễ tân (Receptionist)**: Tiếp nhận đơn, tạo đơn hộ khách, kiểm tra đơn, chấp nhận (`ACCEPTED`) hoặc từ chối (`REJECTED` bắt buộc ghi lý do), theo dõi trạng thái, hỗ trợ khách hàng, bàn giao máy.
- **Kỹ thuật viên (Technician)**: Xem đơn được phân công, kiểm tra chẩn đoán, đề xuất phương án, lập báo giá, gửi yêu cầu xuất linh kiện cho thủ kho, ghi nhật ký và ảnh trước/sau, xác nhận hoàn thành (`COMPLETED`).
- **Thủ kho (Warehouse Staff)**: Quản lý danh mục và tồn kho linh kiện, tiếp nhận yêu cầu xuất linh kiện, kiểm tra tồn kho, chấp nhận hoặc từ chối (ghi lý do), xác nhận số lượng thực tế xuất, cập nhật tồn kho.
- **Kế toán (Accountant)**: Tiếp nhận phiếu `COMPLETED`, kiểm tra tổng chi phí và các khoản phát sinh đã được khách duyệt, lập hóa đơn, ghi nhận thanh toán, quản lý lịch sử thanh toán, theo dõi doanh thu.
- **Khách hàng (Customer)**: Đăng ký/nhờ tạo tài khoản, tạo yêu cầu sửa chữa, theo dõi tiến độ, xem chẩn đoán & báo giá, đồng ý hoặc từ chối báo giá, xác nhận chi phí phát sinh, xem lịch sử sửa chữa và hóa đơn.

## 4. Quy tắc cốt lõi về dữ liệu & an toàn
1. Mỗi phiếu thuộc một khách hàng và thiết bị tại thời điểm tạo.
2. Chuyển trạng thái cần đúng thẩm quyền và lưu vết vào `repair_status_history` (actor, thời điểm, trạng thái cũ/mới, lý do).
3. Không bao giờ cho phép tồn kho âm. Mọi thao tác xuất kho kiểm tra tồn (`quantity_on_hand >= quantity`) và khóa dòng trong transaction.
4. Công nợ và tổng tiền được tính toán và kiểm tra tại backend, không phụ thuộc vào client.
5. Khách hàng và thiết bị dùng cơ chế Deactivate thay vì xóa cứng để bảo toàn dữ liệu lịch sử nghiệp vụ.

## 5. Quy tắc Ứng dụng Di động & Thông báo đẩy (Mobile App & Push Notifications)
1. **Quản lý Token Thiết bị**:
   - Khi người dùng đăng nhập thành công trên App Mobile, ứng dụng tự động xin quyền và đăng ký token thiết bị lên backend (`user_device_tokens`).
   - Khi người dùng đăng xuất, token tương ứng được thu hồi để đảm bảo tính riêng tư và bảo mật.
2. **Kích hoạt Thông báo Đẩy theo Sự kiện Nghiệp vụ (Push Event Triggers)**:
   - Khi Lễ tân/Admin phân công KTV (`ASSIGNED`): Gửi thông báo đến thiết bị KTV phụ trách kèm mã phiếu.
   - Khi KTV lập báo giá mới (`AWAITING_ADMIN_APPROVAL`): Gửi thông báo thẩm định cấp 1 đến các Quản trị viên/Quản lý.
   - Khi Admin phê duyệt báo giá (`AWAITING_CUSTOMER_APPROVAL`): Gửi thông báo đến điện thoại của Khách hàng để xem chi tiết và duyệt 1-chạm.
   - Khi Khách hàng phê duyệt báo giá (`APPROVED`): Gửi thông báo tức thì đến KTV báo hiệu khách đã đồng ý và cho phép bắt đầu sửa chữa.
   - Khi Khách hàng từ chối báo giá (`REJECTED`): Gửi thông báo kèm lý do từ chối đến KTV và Quản trị viên.
   - Khi KTV hoàn thành sửa chữa (`COMPLETED`): Thông báo cho Kế toán thu tiền và Khách hàng chuẩn bị nhận máy.
3. **Phân vùng Không gian Làm việc Di động**:
   - Mọi người dùng khi đăng nhập đều được điều hướng trực tiếp vào không gian làm việc chuyên biệt cho vai trò của mình (Customer, Admin, Receptionist, Warehouse Staff, Accountant, Technician), đảm bảo tính tập trung và bảo mật nghiệp vụ.
