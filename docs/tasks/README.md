# Backlog — Hệ thống Quản lý Sửa chữa Điện máy — Điện lạnh

Trạng thái được cập nhật trong từng file task; bảng này là chỉ mục điều hướng tổng thể.

---

## Phase 0–6 (Hoàn thành — v1 Baseline)
| Phase | Task | Trạng thái | Ưu tiên | Phụ thuộc |
| --- | --- | --- | --- | --- |
| 0 Foundation | [TASK-001](TASK-001.md) Project foundation | DONE | High | — |
| 1 Database | [TASK-002](TASK-002.md) Database schema và migrations | DONE | High | TASK-001 |
| 2 Backend | [TASK-003](TASK-003.md) Backend foundation | DONE | High | TASK-002 |
| 2 Backend | [TASK-004](TASK-004.md) Authentication & authorization | DONE | High | TASK-003 |
| 3 Core | [TASK-005](TASK-005.md) Customers & devices | DONE | High | TASK-004 |
| 3 Core | [TASK-006](TASK-006.md) Repair orders & state machine | DONE | High | TASK-005 |
| 3 Core | [TASK-007](TASK-007.md) Assignment, diagnosis & quotes | DONE | High | TASK-006 |
| 4 Operations | [TASK-008](TASK-008.md) Inventory & repair items | DONE | Medium | TASK-007 |
| 4 Operations | [TASK-009](TASK-009.md) Payments, receivables & warranty | DONE | Medium | TASK-008 |
| 5 Frontend | [TASK-010](TASK-010.md) Frontend foundation & authentication | DONE | High | TASK-004 |
| 5 Frontend | [TASK-011](TASK-011.md) Core repair workflow UI | DONE | High | TASK-007, TASK-010 |
| 5 Frontend | [TASK-012](TASK-012.md) Operations & reports UI | DONE | Medium | TASK-009, TASK-010 |
| 6 Quality | [TASK-013](TASK-013.md) Quality, delivery & operations guide | DONE | High | TASK-011, TASK-012 |

---

## Phase U — Nâng cấp Spec v2 (Multi-log, Parts Requests, Portal, Invoices)
| Phase | Task | Mô tả | Trạng thái | Phụ thuộc |
| --- | --- | --- | --- | --- |
| U0 Schema | [TASK-U01](TASK-U01.md) | Migration schema v2: 4 bảng mới (repair_logs, parts_requests...), roles mới | DONE | — |
| U0 Auth | [TASK-U02](TASK-U02.md) | AuthContext + middleware phân quyền 6 roles | DONE | TASK-U01 |
| U1 API | [TASK-N01](TASK-N01.md) | Customer self-service API: đăng ký, tạo đơn có ảnh | DONE | TASK-U02 |
| U1 API | [TASK-N02](TASK-N02.md) | Repair Logs API: CRUD nhật ký sửa chữa nhiều lần/phiếu | DONE | TASK-U01 |
| U1 API | [TASK-N03](TASK-N03.md) | Parts Request API: KTV tạo yêu cầu → Kho duyệt → Xuất kho nguyên tử | DONE | TASK-U01 |
| U1 API | [TASK-N04](TASK-N04.md) | Trạng thái WAITING_PARTS + PENDING_RECEPTION vào state machine | DONE | TASK-U01 |
| U1 API | [TASK-N05](TASK-N05.md) | Invoice API: Tạo hóa đơn, xuất PDF | DONE | TASK-U01 |
| U2 Frontend | [TASK-F01](TASK-F01.md) | Customer Portal: Đăng ký, đặt lịch, theo dõi đơn | DONE | TASK-N01 |
| U2 Frontend | [TASK-F02](TASK-F02.md) | Dashboard riêng theo 5 vai trò | DONE | TASK-U02 |
| U2 Frontend | [TASK-F03](TASK-F03.md) | Repair Logs UI trong chi tiết phiếu | DONE | TASK-N02 |
| U2 Frontend | [TASK-F04](TASK-F04.md) | Parts Request UI: KTV tạo yêu cầu + Kho duyệt/xuất | DONE | TASK-N03 |
| U2 Frontend | [TASK-F05](TASK-F05.md) | Invoice UI: Xem & in PDF | DONE | TASK-N05 |
| U3 Quality | [TASK-Q01](TASK-Q01.md) | Kiểm thử tích hợp E2E toàn luồng v2 | DONE | TASK-F04 |
| U3 Docs | [TASK-Q02](TASK-Q02.md) | Cập nhật toàn bộ tài liệu API, Business Rules, Database | DONE | TASK-Q01 |

---

## Phase R — Chuẩn hóa Quy trình 6 Roles & 10 Giai đoạn chuẩn
| Phase | Task | Mô tả | Trạng thái | Phụ thuộc |
| --- | --- | --- | --- | --- |
| R1 Nền tảng | [TASK-R01](TASK-R01.md) | Migration DB, Role ACCOUNTANT & WAREHOUSE_STAFF, 10 trạng thái mới | DONE | — |
| R2 Tiếp nhận | [TASK-R02](TASK-R02.md) | Giai đoạn 1 & 2: Tiếp nhận (`ACCEPTED`) hoặc Từ chối (`REJECTED`) | DONE | TASK-R01 |
| R3 Phê duyệt 2 cấp | [TASK-R03](TASK-R03.md) | Giai đoạn 3-6: KTV báo giá → Admin duyệt → Khách duyệt (`APPROVED`) | DONE | TASK-R02 |
| R4 Sửa chữa & Kho | [TASK-R04](TASK-R04.md) | Giai đoạn 7 & 8: KTV sửa chữa (`IN_PROGRESS`), xuất linh kiện, báo giá bổ sung | DONE | TASK-R03 |
| R5 Kế toán & Thu tiền | [TASK-R05](TASK-R05.md) | Giai đoạn 9 & 10: Hoàn tất (`COMPLETED`), thu tiền đủ 100% (`PAID`), bàn giao (`DELIVERED`) | DONE | TASK-R04 |
| R6 Dashboard | [TASK-R06](TASK-R06.md) | Dashboard chuyên biệt 6 Roles, UI Kế toán, E2E toàn hệ thống | DONE | TASK-R05 |

---

## Phase M — Mobile App (React Native + Expo) — 4 Giai đoạn
| Giai đoạn | Mã Task | Mô tả chi tiết | Trạng thái | Phụ thuộc |
| --- | --- | --- | --- | --- |
| **Giai đoạn 1** | [TASK-M01](TASK-M01-mobile-foundation-auth.md) | **Khởi tạo & Authentication**: Scaffold Expo TypeScript, Navigation đa vai trò, SecureStore, FaceID / Vân tay, API Client layer | DONE | TASK-R06 |
| **Giai đoạn 2** | [TASK-M02](TASK-M02-technician-field-app.md) | **App Kỹ thuật viên (Field Tech)**: Nhận đơn, chỉ đường, chẩn đoán, chụp ảnh Trước/Sau thiết bị, lập báo giá & yêu cầu linh kiện kho | DONE | TASK-M01 |
| **Giai đoạn 3** | [TASK-M03](TASK-M03-customer-portal-push-notification.md) | **Cổng Khách hàng & Push Notification**: Đặt lịch sửa tại nhà, theo dõi tiến trình 10 giai đoạn thời gian thực, duyệt báo giá 1 chạm, thẻ bảo hành điện tử, tích hợp FCM | DONE | TASK-M01 |
| **Giai đoạn 4** | [TASK-M04](TASK-M04-admin-approval-e2e-delivery.md) | **Admin Thẩm định & Hoàn thiện E2E**: Admin duyệt báo giá tầng 1, KPI dashboard di động, kiểm thử liên thông Web-App, đóng gói APK & cấu hình iOS | DONE | TASK-M02, TASK-M03 |
| **Giai đoạn 5** | [TASK-M05](TASK-M05-multi-role-and-registration.md) | **Mở rộng Đa vai trò Di động & Đăng ký**: Phân hệ Lễ tân, Thủ kho, Kế toán trên Mobile & Màn hình Đăng ký tài khoản Khách hàng mới | DONE | TASK-M04 |
