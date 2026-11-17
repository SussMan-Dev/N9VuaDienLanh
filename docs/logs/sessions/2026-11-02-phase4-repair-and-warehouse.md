# Session Log: 2026-11-02 Phase 4 — KTV Sửa chữa & Kho Xuất Linh Kiện, Báo Giá Bổ Sung (Giai đoạn 7 & 8)

## 1. Yêu cầu nghiệp vụ & Mục tiêu
- **Giai đoạn 7: Kỹ thuật viên thực hiện sửa chữa (`IN_PROGRESS`)**:
  - KTV thực hiện công việc theo phương án đã được khách hàng chấp thuận (`APPROVED`).
  - Ghi nhật ký sửa chữa (`repair_logs`):
    + Kỹ thuật viên thực hiện (`technician_user_id`).
    + Nội dung công việc (`work_performed`).
    + Thời gian thực hiện (`performed_at`).
    + Tình trạng thiết bị (`device_condition`).
    + Nguyên nhân hư hỏng (`root_cause`).
    + Kết quả kiểm tra vận hành sau sửa (`test_result`).
    + Ghi chú (`notes`).
    + Hình ảnh đính kèm trước/sau sửa chữa (`images_before`, `images_after`).
- **Giai đoạn 8: Yêu cầu linh kiện từ kho (`WAITING_PARTS`)**:
  - Trong quá trình sửa chữa, nếu thiếu linh kiện:
    + KTV tạo yêu cầu xuất linh kiện (`parts_requests` + `parts_request_items`).
    + Ticket chuyển sang trạng thái `WAITING_PARTS`.
  - Thủ kho (`WAREHOUSE_STAFF` / `WAREHOUSE_MANAGER`) tiếp nhận yêu cầu:
    + Kiểm tra tồn kho.
    + Chấp nhận (`APPROVED`) hoặc Từ chối (`REJECTED`, bắt buộc ghi lý do).
    + Khi xuất kho thực tế (`ISSUED`): Xác nhận số lượng xuất (`quantity_issued`), trừ tồn kho nguyên tử (`inventory_transactions`), lưu linh kiện sử dụng vào `repair_order_parts`.
    + Sau khi xuất kho xong, Ticket tự động chuyển về lại `IN_PROGRESS` để KTV tiếp tục sửa chữa.
- **Quy tắc đặc biệt cốt lõi: Quản lý chi phí phát sinh**:
  - *Không được tự động cộng chi phí phát sinh vào khoản tiền khách hàng phải trả mà chưa có sự xác nhận*.
  - Nếu chi phí linh kiện làm thay đổi tổng báo giá: Hệ thống cho phép KTV tạo **Báo giá bổ sung** (`is_supplemental = 1`).
  - Báo giá bổ sung phải qua 2 tầng duyệt: Admin duyệt (`AWAITING_ADMIN_APPROVAL` -> `AWAITING_CUSTOMER_APPROVAL`) và Khách hàng xác nhận (`APPROVED`).
  - Chỉ khi khách hàng đồng ý, hệ thống mới cập nhật tổng tiền phải trả trên `repair_orders` (`labor_total`, `parts_total`).
  - Lưu lịch sử tất cả các lần yêu cầu và xuất linh kiện.

---

## 2. Chi tiết triển khai

### Backend
1. `backend/src/lib/repair-state-machine.js`:
   - Bổ sung chuyển tiếp từ `IN_PROGRESS` sang `AWAITING_ADMIN_APPROVAL` khi KTV lập báo giá bổ sung.
2. `backend/src/services/workflow-service.js`:
   - Hàm `quote`:
     - Nhận cờ `body.isSupplemental` (boolean) và lưu vào `quotes.is_supplemental`.
     - Cho phép lập báo giá bổ sung ngay cả khi đơn đang ở `IN_PROGRESS` hoặc `WAITING_PARTS`.
     - Ghi lịch sử trạng thái: `KTV lập báo giá bổ sung v${versionNo} do phát sinh linh kiện, gửi Admin thẩm định & phê duyệt`.
   - Hàm `adminDecideQuote`:
     - Khi Admin duyệt: chuyển sang `AWAITING_CUSTOMER_APPROVAL`.
     - Khi Admin từ chối: chuyển về `ASSIGNED` kèm ghi chú điều chỉnh.
   - Hàm `decide` (Khách duyệt báo giá):
     - Khi khách hàng chấp thuận: chuyển sang `APPROVED` và cập nhật lại snapshot tổng chi phí mới (`labor_total`, `parts_total`...).
     - Khi khách hàng từ chối báo giá bổ sung: chuyển về `ASSIGNED` giữ nguyên gói ban đầu mà không hủy đơn hàng (`CANCELLED`).
3. `backend/src/services/parts-request-service.js`:
   - `createPartsRequest`: Khi KTV gửi yêu cầu, tự động chuyển đơn sang `WAITING_PARTS`.
   - `rejectPartsRequest`: Bắt buộc nhập lý do từ chối; nếu không còn yêu cầu nào pending thì tự động chuyển đơn về lại `IN_PROGRESS`.
   - `issuePartsRequest`:
     - Trừ tồn kho nguyên tử qua `inventory_transactions`.
     - Lưu chi phí linh kiện vào `repair_order_parts`.
     - Bảo vệ tài chính khách hàng: Không tự ý cộng vào `repair_orders.parts_total` nếu đã có báo giá APPROVED (phải thông qua báo giá bổ sung).
     - Tự động chuyển đơn từ `WAITING_PARTS` về lại `IN_PROGRESS`.
4. `backend/src/services/repair-log-service.js`:
   - Lưu trữ và parse mảng JSON hình ảnh trước/sau sửa chữa (`images_before`, `images_after`).
5. `backend/src/services/customer-portal-service.js`:
   - Trả về cờ `isSupplemental` trong danh sách báo giá cho Cổng Khách Hàng.

### Frontend
1. `frontend/src/pages/RepairDetailPage.jsx`:
   - **Tab Nhật ký sửa chữa (`logs`)**:
     - Modal thêm nhật ký có thêm 2 input nhập link hình ảnh: Ảnh trước sửa chữa (`imagesBefore`) và Ảnh sau sửa chữa (`imagesAfter`).
     - Hiển thị danh sách thumbnail ảnh trước và sau sửa chữa, click mở xem kích thước đầy đủ.
   - **Tab Yêu cầu linh kiện (`partsRequests`)**:
     - Cho phép KTV tạo yêu cầu cấp phát linh kiện từ danh mục tồn kho kèm lý do.
     - Cho phép Thủ kho / Quản trị viên duyệt yêu cầu, từ chối có lý do, và xác nhận xuất kho thực tế (`issue`).
   - **Báo giá bổ sung khi phát sinh**:
     - Tại Tab Báo giá: Thêm nút **"⚡ + Lập báo giá bổ sung (Phát sinh)"** khi đơn đang ở `IN_PROGRESS` hoặc `WAITING_PARTS`.
     - Header của từng Quote Box hiển thị rõ badge `⚡ Báo giá bổ sung`.
   - **Workflow Action Bar**:
     - Khi `order.repairStatus === 'WAITING_PARTS'`: Hiển thị badge cam *"📦 GĐ 8: Đang chờ Thủ kho duyệt & xuất linh kiện"* cùng nút xem nhanh yêu cầu kho.
     - Khi `order.repairStatus === 'IN_PROGRESS'`: Hiển thị badge *"🔧 GĐ 7: Đang tiến hành sửa chữa"* cùng các nút: Ghi nhật ký & ảnh, Yêu cầu linh kiện kho, Báo giá bổ sung, Hoàn thành sửa chữa (`COMPLETED` - GĐ 9).
2. `frontend/src/pages/CustomerPortalPage.jsx`:
   - Hiển thị rõ ràng badge `⚡ Báo giá bổ sung` và `⚡ Phát sinh linh kiện` để khách hàng nắm bắt được nguyên nhân và an tâm phê duyệt.

---

## 3. Kết quả kiểm thử & Nghiệm thu
1. **Unit Tests Backend**:
   - `cd backend; npm test`: **63/63 tests PASS (100%)**.
2. **Frontend Build**:
   - `cd frontend; npm run build`: **PASS** trong 193ms (0 lỗi).
3. **Integration Test Runtime E2E (10 bước)**:
   - Bước 1: Login 5 roles Customer, Admin, Receptionist, Technician, Warehouse (`kho_an`) thành công.
   - Bước 2: Tạo đơn, duyệt, báo giá và đưa Ticket vào `IN_PROGRESS` (GĐ 7).
   - Bước 3: KTV ghi nhật ký sửa chữa kèm 2 ảnh trước và 1 ảnh sau sửa chữa ➔ Lưu trữ và truy vấn chính xác.
   - Bước 4: KTV tạo yêu cầu linh kiện kho (Tụ quạt 40uF, Gas R32) ➔ Ticket chuyển sang `WAITING_PARTS` (GĐ 8).
   - Bước 5: Thủ kho kiểm tra kho và duyệt yêu cầu (`APPROVED`).
   - Bước 6: Thủ kho xác nhận xuất kho thực tế (`ISSUED`) ➔ Tồn kho trừ nguyên tử, Ticket tự động chuyển về `IN_PROGRESS`.
   - Bước 7: KTV lập Báo giá bổ sung do phát sinh linh kiện (`isSupplemental = true`) ➔ Ticket sang `AWAITING_ADMIN_APPROVAL`.
   - Bước 8: Admin thẩm định và duyệt Báo giá bổ sung ➔ Ticket sang `AWAITING_CUSTOMER_APPROVAL`.
   - Bước 9: Khách hàng xem trên Portal (nhận diện rõ báo giá bổ sung phát sinh) và chấp thuận ➔ Ticket sang `APPROVED`, cập nhật tổng tiền mới.
   - Bước 10: KTV tiếp tục sửa chữa, ghi nhật ký hoàn tất kèm ảnh sau sửa chữa, và xác nhận hoàn thành công việc ➔ Ticket chuyển sang `COMPLETED` (GĐ 9) thành công!

