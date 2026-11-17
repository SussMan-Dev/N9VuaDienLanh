# Decisions
Tài liệu này ghi quyết định kiến trúc; không thay thế task hoặc worklog.
## ADR-001 — ReactJS, ExpressJS và MySQL cho MVP
- **Ngày:** 2026-10-27
- **Trạng thái:** Accepted
- **Bối cảnh:** Cần web app quản lý vận hành nội bộ có frontend/backend tách rời.
- **Quyết định:** ReactJS SPA, ExpressJS REST API, MySQL dữ liệu nghiệp vụ.
- **Hệ quả:** Ranh giới API rõ và hệ sinh thái lớn; cần duy trì hai ứng dụng và migration.
## ADR-002 — Tài liệu-first, tách ba loại nhật ký
- **Ngày:** 2026-10-27
- **Trạng thái:** Accepted
- **Bối cảnh:** Cần kế thừa công việc giữa các phiên AI, không lẫn lộn lịch sử.
- **Quyết định:** Task cho yêu cầu/nghiệm thu; worklog cho việc đã làm; decisions cho lý do/đánh đổi.
- **Hệ quả:** Tăng kỷ luật tài liệu, mỗi task cập nhật nhiều điểm có chủ đích.
## ADR-003 — Mô hình chi nhánh và tồn kho theo kho
- **Ngày:** 2026-10-27
- **Trạng thái:** Accepted
- **Bối cảnh:** Người dùng xác nhận hoạt động nhiều chi nhánh/kho.
- **Quyết định:** Dùng `branches` và `warehouses`; tồn lưu theo cặp kho-vật tư và mọi biến động vào `inventory_transactions`.
- **Hệ quả:** Báo cáo/xuất kho chính xác theo địa điểm; TASK-008 phải dùng transaction và locking cho thay đổi tồn.
## ADR-004 — Backend foundation tối giản và pool MySQL
- **Ngày:** 2026-10-27
- **Trạng thái:** Accepted
- **Bối cảnh:** Cần ExpressJS có cấu hình an toàn, kiểm tra MySQL và lỗi API nhất quán trước endpoint nghiệp vụ.
- **Quyết định:** Dùng Express, `mysql2` promise pool và `dotenv`; dùng Node built-ins cho test, UUID và logging thay vì thêm framework/library khác.
- **Hệ quả:** Ít dependency và dễ vận hành; validation request chi tiết sẽ được thêm theo từng endpoint.
## ADR-005 — Opaque Bearer session thay JWT
- **Ngày:** 2026-10-27
- **Trạng thái:** Accepted
- **Bối cảnh:** Q-002 yêu cầu chọn cơ chế xác thực, trong khi hệ thống cần logout có hiệu lực ngay và chưa có hạ tầng session ngoài MySQL.
- **Quyết định:** Phát hành token ngẫu nhiên 256-bit, chỉ lưu SHA-256 hash trong `auth_sessions`; token hết hạn 12 giờ và được gửi qua Bearer header.
- **Hệ quả:** Có thể thu hồi token ngay, không cần thêm dependency; mỗi request xác thực cần truy vấn MySQL. Q-002 được đóng với lựa chọn này.
## ADR-006 — Quy trình phê duyệt báo giá và phân quyền kỹ thuật viên
- **Ngày:** 2026-10-30
- **Trạng thái:** Accepted
- **Bối cảnh:** Cần đảm bảo kỹ thuật viên chỉ thao tác trên phiếu được phân công; báo giá phải có lịch sử quyết định duyệt/từ chối; và chặn việc bắt đầu sửa chữa khi chưa có phê duyệt hợp lệ.
- **Quyết định:**
  - Phân công kỹ thuật viên thuộc thẩm quyền quản lý vận hành (`operations.manage`); mỗi thời điểm một phiếu chỉ có 1 phân công tích cực.
  - Kỹ thuật viên (chỉ có quyền `repair.manage`) bị chặn với `403 NOT_ASSIGNED` nếu thao tác trên phiếu mình không được phân công.
  - Báo giá được phiên bản hóa kèm danh sách chi tiết `quote_items` và lịch sử quyết định append-only `quote_decision_history`. Khi duyệt, các báo giá khác của phiếu chuyển thành `SUPERSEDED` và snapshot tổng tiền sang `repair_orders`.
  - Chuyển trạng thái sang `REPAIRING` bắt buộc kiểm tra có báo giá `APPROVED`, ngoại trừ quản lý override với lý do audit.
- **Hệ quả:** Toàn vẹn luồng vận hành và tài chính, đóng câu hỏi Q-004.
## ADR-007 — Quản lý tồn kho không tồn âm và xuất kho nguyên tử
- **Ngày:** 2026-10-30
- **Trạng thái:** Accepted
- **Bối cảnh:** Cần kiểm soát biến động tồn kho khi sử dụng linh kiện cho phiếu sửa chữa; ngăn chặn bán/xuất âm vật tư thực tế.
- **Quyết định:**
  - Không cho phép tồn kho âm. Mọi thao tác xuất kho kiểm tra `quantity_on_hand >= quantity` với khóa dòng `SELECT ... FOR UPDATE`.
  - Xuất vật tư cho phiếu sửa chữa thực hiện nguyên tử trong transaction cùng ghi nhận `repair_order_parts` và `inventory_transactions`.
  - Snapshot giá vốn và giá bán tại thời điểm xuất; cập nhật `parts_total` trên phiếu sửa chữa.
  - Cho phép xóa vật tư khi phiếu đang sửa chữa, tự động hoàn kho nguyên tử.
- **Hệ quả:** Đảm bảo toàn vẹn dữ liệu kho và tài chính, đóng câu hỏi Q-005.
## ADR-008 — Vite React SPA foundation cho frontend
- **Ngày:** 2026-10-30
- **Trạng thái:** Accepted
- **Bối cảnh:** Cần web UI cho nhân viên cửa hàng (tiếp nhận, kỹ thuật viên, quản lý) tương tác với REST API.
- **Quyết định:**
  - Sử dụng Vite + React 18 SPA, react-router-dom v6 cho định tuyến.
  - Fetch API thuần với HTTP client wrapper (xử lý Bearer token, 401 redirect, response `{ data, error }`).
  - AuthContext và custom hooks (`useAuth`, `useApi`) quản lý phiên và gọi dữ liệu.
  - Xử lý đủ 4 trạng thái giao diện: loading, empty, error, success; không đặt logic quyết định nghiệp vụ trọng yếu ở frontend.
- **Hệ quả:** Frontend nhẹ, build nhanh, dễ mở rộng sang các màn hình nghiệp vụ tiếp theo.
## ADR-009 — Thanh toán nhiều lần, chặn giao máy khi còn công nợ và liên kết bảo hành
- **Ngày:** 2026-10-30
- **Trạng thái:** Accepted
- **Bối cảnh:** Cần xử lý thanh toán từng phần/đặt cọc, tính công nợ chính xác, ngăn giao máy khi khách chưa thanh toán đủ và quản lý phiếu bảo hành sửa lại.
- **Quyết định:**
  - Cho phép thanh toán nhiều lần trên mỗi phiếu, sinh mã biên lai `REC-...`.
  - Thanh toán vượt số dư nợ bắt buộc có quyền quản lý và lý do ghi nhận.
  - Hủy thanh toán (`VOIDED`) yêu cầu quyền `operations.manage` và lý do audit.
  - Chuyển trạng thái sang `DELIVERED` bắt buộc công nợ bằng 0 (`balance <= 0`), trừ khi có manager override.
  - Cấp bảo hành sinh mã `WAR-...`, tra cứu nhanh theo mã. Phiếu sửa chữa bảo hành liên kết với phiếu gốc qua `original_repair_order_id` trên cùng thiết bị.
- **Hệ quả:** Toàn vẹn quy trình thanh toán và công nợ, chống thất thoát tài chính khi bàn giao thiết bị, đóng câu hỏi Q-006.

## ADR-010 — Chuẩn hóa hệ thống 6 Roles và quy trình nghiệp vụ 10 giai đoạn
- **Ngày:** 2026-11-02
- **Trạng thái:** Accepted
- **Bối cảnh:** Yêu cầu nghiệp vụ nâng cấp phân định rõ ranh giới giữa 6 vai trò (Admin, Lễ tân, Kỹ thuật viên, Thủ kho, Kế toán, Khách hàng) và quy trình 10 giai đoạn với 2 cấp duyệt báo giá (Admin duyệt trước, sau đó gửi khách hàng duyệt) và tách bạch hoàn thành sửa chữa (`COMPLETED`) với thanh toán (`PAID`).
- **Quyết định:**
  - Bổ sung vai trò `ACCOUNTANT` (Kế toán) với quyền `billing.manage`, chịu trách nhiệm kiểm tra chi phí và ghi nhận thanh toán `PAID`. Chuẩn hóa `WAREHOUSE_STAFF` (Thủ kho).
  - Mở rộng vòng đời Ticket thành 10 giai đoạn: `PENDING` → `ACCEPTED` / `REJECTED` (Lễ tân) → `ASSIGNED` (Admin) → `AWAITING_ADMIN_APPROVAL` (KTV lập giá) → `AWAITING_CUSTOMER_APPROVAL` (Admin duyệt) → `APPROVED` (Khách duyệt) → `IN_PROGRESS` (KTV sửa) → `WAITING_PARTS` (Kho) → `COMPLETED` (KTV xong việc) → `PAID` (Kế toán thu tiền) → `DELIVERED`.
  - Tách bạch: `COMPLETED` ghi nhận KTV hoàn tất sửa chữa và không yêu cầu công nợ bằng 0; chỉ khi chuyển sang `PAID` (hoặc `DELIVERED`) mới bắt buộc công nợ bằng 0.
  - Bắt buộc: Lễ tân từ chối Ticket phải có lý do (`rejection_reason`).
  - Thêm các trường kiểm soát phê duyệt Admin (`admin_approval_status`, `admin_approved_by_user_id`, `admin_approved_at`, `admin_reject_note`) và báo giá bổ sung (`is_supplemental`) trên bảng `quotes`.
- **Hệ quả:** Phân quyền chặt chẽ theo đúng chuyên môn từng phòng ban, đảm bảo không thất thoát doanh thu và minh bạch quá trình chẩn đoán/báo giá.
