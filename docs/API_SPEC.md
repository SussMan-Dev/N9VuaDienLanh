# API Specification

## Repair orders and status
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/repair-orders` | `repair.manage` or `operations.manage` | List; filters `customerId`, `deviceId`, `repairStatus`, `originalRepairOrderId`; sort allowlist `code`, `receivedAt`, `createdAt`, `repairStatus` |
| `POST` | `/api/v1/repair-orders` | `intake.manage` | `{ deviceId, originalRepairOrderId?, reportedIssue, intakeCondition?, promisedAt?, notes? }`; branch comes from the logged-in user; returns `201` |
| `GET` | `/api/v1/repair-orders/:id` | `repair.manage` or `operations.manage` | Order detail (bao gồm `assignedTechnicianId`, `assignedTechnicianName`, `originalRepairOrderId`, `originalRepairOrderCode`, amounts) |
| `GET` | `/api/v1/repair-orders/:id/status-history` | `repair.manage` or `operations.manage` | Append-only status history |
| `POST` | `/api/v1/repair-orders/:id/status-transitions` | `repair.manage` (KTV được phân công), `intake.manage` (Lễ tân tiếp nhận/thu tiền) hoặc `operations.manage`/`ADMIN` | `{ toStatus, reason?, override? }` |

An invalid transition returns `409 INVALID_STATUS_TRANSITION`; invalid input returns `422`. A reason is required for `CANCELLED`, `UNREPAIRABLE`, or an override. Only `MANAGER` and `ADMIN` may override into `REPAIRING`; the history reason is prefixed `OVERRIDE:`. Kỹ thuật viên chưa được phân công phiếu sẽ bị từ chối với `403 NOT_ASSIGNED`.

Chuyển trạng thái sang `DELIVERED` bắt buộc công nợ phải bằng 0 (`balance <= 0`). Nếu còn số dư nợ, trả về `409 OUTSTANDING_BALANCE_REMAINING`, trừ khi quản lý override có lý do.

## Assignment, diagnosis & quotes (TASK-007)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/repair-orders/:id/assignments` | `repair.manage` or `operations.manage` | Lịch sử phân công kỹ thuật viên, bao gồm trạng thái đang phụ trách `isActive` |
| `POST` | `/api/v1/repair-orders/:id/assignments` | `operations.manage` | `{ technicianUserId, notes? }` → tạo phân công mới, kết thúc phân công cũ trong cùng transaction |
| `GET` | `/api/v1/repair-orders/:id/diagnostics` | `repair.manage` or `operations.manage` | Danh sách chẩn đoán của phiếu |
| `POST` | `/api/v1/repair-orders/:id/diagnostics` | `repair.manage` (kỹ thuật viên được phân công) or `operations.manage` | `{ diagnosisText, recommendedAction?, estimatedLabor? }` → trả `201` |
| `GET` | `/api/v1/repair-orders/:id/quotes` | `repair.manage` or `operations.manage` | Danh sách các phiên bản báo giá của phiếu |
| `GET` | `/api/v1/repair-orders/:id/quotes/:quoteId` | `repair.manage` or `operations.manage` | Chi tiết báo giá kèm danh sách `items` và `decisionHistory` |
| `POST` | `/api/v1/repair-orders/:id/quotes` | `repair.manage` (kỹ thuật viên được phân công) or `operations.manage` | `{ diagnosticId?, items?, laborAmount?, partsAmount?, discountAmount?, taxAmount?, validUntil?, note? }` → tạo quote `PENDING_CUSTOMER`, version tự tăng |
| `POST` | `/api/v1/repair-orders/:id/quotes/:quoteId/decisions` | `repair.manage` (kỹ thuật viên được phân công) or `operations.manage` | `{ decision: 'APPROVED' \| 'REJECTED', customerContactName?, note? }` → cập nhật trạng thái quote và lưu trace vào `quote_decision_history` |

Khi báo giá được `APPROVED`, hệ thống cập nhật snapshot số tiền trên `repair_orders` (`labor_total`, `parts_total`, `discount_total`, `tax_total`) và chuyển các báo giá khác của phiếu sang `SUPERSEDED`. Chuyển sang `REPAIRING` bắt buộc phải có báo giá `APPROVED` (trừ khi có manager override kèm lý do).

## Inventory & repair items (TASK-008)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/inventory/items` | `inventory.manage` | List vật tư; lọc `search`, `isActive`; sort `name`, `sku`, `createdAt` |
| `POST` | `/api/v1/inventory/items` | `inventory.manage` | `{ sku, name, unit?, standardCost?, defaultSalePrice?, reorderLevel? }` → trả `201` |
| `GET` | `/api/v1/inventory/items/:id` | `inventory.manage` | Chi tiết vật tư kèm tổng tồn kho toàn hệ thống `totalOnHand` |
| `PATCH` | `/api/v1/inventory/items/:id` | `inventory.manage` | `{ name?, unit?, standardCost?, defaultSalePrice?, reorderLevel?, isActive? }` (không sửa `sku`) |
| `GET` | `/api/v1/inventory/stocks` | `inventory.manage` | Tồn theo kho-vật tư; lọc `warehouseId`, `itemId`, `lowStock=true` |
| `GET` | `/api/v1/inventory/stocks/:warehouseId/:itemId` | `inventory.manage` | Chi tiết tồn của 1 vật tư tại 1 kho |
| `POST` | `/api/v1/inventory/transactions` | `inventory.manage` | `{ warehouseId, inventoryItemId, transactionType, quantity, unitCostSnapshot?, referenceCode?, note? }`. Type: `RECEIPT`, `ISSUE`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER_IN`, `TRANSFER_OUT` |
| `GET` | `/api/v1/inventory/transactions` | `inventory.manage` | Sổ biến động kho; lọc `warehouseId`, `itemId`, `repairOrderId`, `transactionType` |
| `GET` | `/api/v1/repair-orders/:id/parts` | `repair.manage` or `operations.manage` | Danh sách vật tư/linh kiện sử dụng trên phiếu |
| `POST` | `/api/v1/repair-orders/:id/parts` | `repair.manage` or `operations.manage` | `{ inventoryItemId?, description?, quantity, unitCostSnapshot?, unitPriceSnapshot? }` → xuất kho tự động nếu có `inventoryItemId`, snapshot giá, cập nhật `parts_total` |
| `DELETE` | `/api/v1/repair-orders/:id/parts/:partId` | `repair.manage` or `operations.manage` | Xóa vật tư khỏi phiếu, hoàn kho tự động và cập nhật `parts_total` |

Thao tác xuất kho kiểm tra tồn (`quantity_on_hand >= quantity`) với `SELECT ... FOR UPDATE`. Nếu thiếu tồn, trả `409 INSUFFICIENT_STOCK`.

## Billing, payments & warranty (TASK-009 & TASK-R05)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/repair-orders/:id/billing` | `intake.manage`, `repair.manage`, `operations.manage`, or `billing.manage` | Tổng hợp công nợ: `totalReceivable`, `totalPaid`, `balance`, `paymentStatus` (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERPAID`) |
| `GET` | `/api/v1/repair-orders/:id/payments` | `intake.manage`, `repair.manage`, `operations.manage`, or `billing.manage` | Danh sách các lần thanh toán, người thu tiền, biên lai `receiptNumber`, trạng thái |
| `POST` | `/api/v1/repair-orders/:id/payments` | `intake.manage`, `operations.manage`, or `billing.manage` | `{ amount, paymentMethod, referenceCode?, note? }` → trả `201`, sinh `REC-...`. Tự động chuyển Ticket sang `PAID` và lưu `paid_at` khi `balance <= 0`. Thanh toán vượt công nợ yêu cầu quản lý + ghi chú |
| `POST` | `/api/v1/repair-orders/:id/payments/:paymentId/void` | `operations.manage` | `{ reason }` → hủy thanh toán, ghi vết voided và tính lại công nợ |
| `GET` | `/api/v1/repair-orders/:id/warranties` | `intake.manage`, `repair.manage`, or `operations.manage` | Danh sách các phiếu bảo hành đã cấp cho phiếu |
| `POST` | `/api/v1/repair-orders/:id/warranties` | `repair.manage` or `operations.manage` | `{ startsAt?, endsAt, terms? }` → cấp bảo hành, sinh mã `WAR-...` |
| `GET` | `/api/v1/repair-orders/:id/warranty-claims` | `intake.manage`, `repair.manage`, or `operations.manage` | Danh sách các phiếu sửa lại / bảo hành liên kết với phiếu gốc này |
| `GET` | `/api/v1/warranties/:code` | `intake.manage`, `repair.manage`, or `operations.manage` | Tra cứu bảo hành theo mã `warrantyCode`, kèm thông tin thiết bị và khách hàng |

## Quy ước
- Base URL `/api/v1`, JSON `camelCase`.
- Lỗi: `{ "error": { "code": "...", "message": "...", "details": [] } }`.
- List dùng `page`, `pageSize`, trả `items`, `meta`.
## Resource MVP dự kiến
| Nhóm | Endpoint chính | Mục đích |
| --- | --- | --- |
| Auth | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | Phiên/danh tính |
| Customers | `GET/POST /customers`, `GET/PATCH /customers/:id` | Khách hàng |
| Devices | `GET/POST /devices`, `GET/PATCH /devices/:id` | Thiết bị |
| Repair orders | `GET/POST /repair-orders`, `GET/PATCH /repair-orders/:id` | Phiếu |
| Status | `POST /repair-orders/:id/status-transitions` | Chuyển trạng thái |
| Diagnostics | `GET/POST /repair-orders/:id/diagnostics` | Chẩn đoán |
| Quotes | `GET/POST /repair-orders/:id/quotes`, `GET /repair-orders/:id/quotes/:quoteId`, `POST /repair-orders/:id/quotes/:quoteId/decisions` | Báo giá |
| Inventory | `GET/POST /inventory/items`, `GET/POST /inventory/transactions`, `GET /inventory/stocks` | Quản lý kho |
| Repair Parts | `GET/POST /repair-orders/:id/parts`, `DELETE /repair-orders/:id/parts/:partId` | Vật tư sử dụng |
| Payments & Billing | `GET /repair-orders/:id/billing`, `GET/POST /repair-orders/:id/payments`, `POST /repair-orders/:id/payments/:paymentId/void` | Thanh toán & Công nợ |
| Warranties | `GET/POST /repair-orders/:id/warranties`, `GET /repair-orders/:id/warranty-claims`, `GET /warranties/:code` | Bảo hành & Sửa lại |
## Foundation endpoints
| Method | Path | Mục đích | Phản hồi |
| --- | --- | --- | --- |
| `GET` | `/health` | Liveness, không truy vấn database | `200 { "status": "ok" }` |
| `GET` | `/api/v1/health` | Readiness, kiểm tra MySQL | `200` khi database đáp ứng; `500` khi lỗi |
## Authentication endpoints
| Method | Path | Request / response | Quyền |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/login` | `{ username, password }` → opaque Bearer token, hạn 12 giờ | Public, giới hạn 5 lần / 15 phút / IP |
| `POST` | `/api/v1/auth/register` | `{ username, password, fullName, phone, email?, address? }` → tạo tài khoản vai trò `CUSTOMER` và bản ghi `customers` liên kết | Public |
| `GET` | `/api/v1/auth/me` | Trả user, roles, permissions của token (bao gồm `customerId`) | Authenticated |
| `POST` | `/api/v1/auth/logout` | Thu hồi session hiện tại, trả `204` | Authenticated |
| `POST` | `/api/v1/auth/change-password` | `{ currentPassword, newPassword }` | Authenticated |
Token gửi qua `Authorization: Bearer <token>`. Các lỗi xác thực dùng `401`; quyền thiếu dùng `403`; rate limit dùng `429`.

## Customer Portal Endpoints (v2)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `POST` | `/api/v1/customer/requests` / `service-requests` | `customer.self_service` or `system.manage` | `{ deviceId?, deviceTypeId?, brand?, model?, issueDescription, images?, contactPhone?, addressLine?, preferredDatetime? }` → tạo thiết bị & phiếu sửa chữa ở trạng thái `PENDING_RECEPTION` |
| `GET` | `/api/v1/customer/orders` | `customer.self_service` or `system.manage` | Danh sách phiếu sửa chữa của chính khách hàng đang đăng nhập, kèm tiến độ trạng thái |
| `GET` | `/api/v1/customer/orders/:id` | `customer.self_service` or `system.manage` | Chi tiết phiếu sửa chữa, bảo hành, thanh toán và danh sách báo giá (`quotes`, `quote_items`) |
| `POST` | `/api/v1/customer/orders/:id/quotes/:quoteId/decide` | `customer.self_service` or `system.manage` | `{ decision: 'APPROVED' \| 'REJECTED', note? }` → Khách hàng duyệt hoặc từ chối báo giá online. Khi `APPROVED`, đơn tự động chuyển `APPROVED` để KTV bắt đầu sửa |
| `GET`, `POST` | `/api/v1/customer/devices` | `customer.self_service` or `system.manage` | Danh sách và thêm mới thiết bị điện lạnh đã đăng ký của chính khách hàng |
| `GET` | `/api/v1/customer/device-types` | `customer.self_service` or `system.manage` | Danh mục dòng thiết bị được trung tâm tiếp nhận |
| `GET` | `/api/v1/customer/warranties` | `customer.self_service` or `system.manage` | Danh sách thẻ bảo hành điện tử của khách hàng kèm tình trạng hiệu lực và thông tin thiết bị |

## Push Notifications Endpoints (Mobile FCM / Expo Push)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `POST` | `/api/v1/notifications/device-token` | Authenticated | `{ token, deviceType: 'ANDROID' \| 'IOS' \| 'MOBILE' }` → Đăng ký token thông báo đẩy của thiết bị |
| `DELETE` | `/api/v1/notifications/device-token` | Authenticated | `{ token }` → Hủy đăng ký token khi người dùng đăng xuất |

## Two-Tier Quote Approval & Workflow Endpoints
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `POST` | `/api/v1/repair-orders/:id/quotes/:quoteId/admin-approval` | `operations.manage`, `system.manage`, or Admin | `{ decision: 'APPROVED' \| 'REJECTED', note? }` → Admin thẩm định báo giá tầng 1. Nếu duyệt: chuyển đơn sang `AWAITING_CUSTOMER_APPROVAL` và gửi thông báo cho khách. Nếu từ chối: trả về `ASSIGNED` kèm ghi chú cho KTV |
| `POST` | `/api/v1/repair-orders/:id/status-transitions` | `intake.manage`, `repair.manage`, `billing.manage`, or Admin | `{ toStatus, reason }` → Chuyển đổi trạng thái phiếu theo state machine 10 giai đoạn chuẩn |

## Repair Logs Endpoints (v2)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/repair-orders/:orderId/logs` | `repair.manage`, `operations.manage`, or assigned Technician | Danh sách nhật ký sửa chữa của phiếu, sắp xếp theo thời gian ghi nhận |
| `POST` | `/api/v1/repair-orders/:orderId/logs` | `repair.manage` (KTV được phân công) or `operations.manage` | `{ initialCondition?, rootCause?, workPerformed, testResult?, beforeImages?, afterImages?, notes?, performedAt? }` → ghi nhật ký lần thực hiện |
| `GET` | `/api/v1/repair-orders/:orderId/logs/:logId` | `repair.manage` or `operations.manage` | Chi tiết 1 bản ghi nhật ký sửa chữa |
| `PATCH` | `/api/v1/repair-orders/:orderId/logs/:logId` | Tác giả bản ghi hoặc Quản lý (`operations.manage`) | Cập nhật nội dung nhật ký, ảnh trước/sau và kết quả kiểm tra |
| `DELETE` | `/api/v1/repair-orders/:orderId/logs/:logId` | Tác giả hoặc Quản lý | Xóa bản ghi nhật ký |

## Parts Requests & Warehouse Workflow Endpoints (v2)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/parts-requests` | `warehouse.manage`, `inventory.manage`, `repair.manage`, `operations.manage` | Danh sách yêu cầu cấp phát linh kiện; lọc `repairOrderId`, `status`; KTV chỉ thấy yêu cầu của mình trừ khi có quyền quản lý |
| `POST` | `/api/v1/parts-requests` | `repair.manage` or `operations.manage` | `{ repairOrderId, reason?, notes?, items: [{ inventoryItemId, quantityRequested, notes? }] }` → tạo yêu cầu cấp phát, sinh mã `PR-...`, trạng thái `PENDING` |
| `GET` | `/api/v1/parts-requests/:id` | `warehouse.manage`, `repair.manage`, or `operations.manage` | Chi tiết yêu cầu cấp phát kèm danh sách linh kiện yêu cầu/duyệt |
| `POST` | `/api/v1/parts-requests/:id/approve` | `warehouse.manage`, `inventory.manage`, or `operations.manage` | `{ items?: [{ id, quantityApproved }] }` → phê duyệt cấp phát, trạng thái `APPROVED` |
| `POST` | `/api/v1/parts-requests/:id/reject` | `warehouse.manage`, `inventory.manage`, or `operations.manage` | `{ rejectionReason }` → từ chối cấp phát, trạng thái `REJECTED` |
| `POST` | `/api/v1/parts-requests/:id/issue` | `warehouse.manage`, `inventory.manage`, or `operations.manage` | `{ warehouseId? }` → thực hiện xuất kho nguyên tử: kiểm tra tồn `FOR UPDATE`, trừ `quantity_on_hand`, tạo transaction `ISSUE`, bổ sung `repair_order_parts`, cập nhật `parts_total` và tự động chuyển đơn từ `WAITING_PARTS` về `REPAIRING` nếu đủ linh kiện |

## Invoices Endpoints (v2)
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/invoices` | `invoice.manage`, `intake.manage`, `operations.manage` | Danh sách hóa đơn bán hàng / dịch vụ |
| `POST` | `/api/v1/invoices` | `invoice.manage` or `operations.manage` | `{ repairOrderId, customerId, laborCost, partsCost, otherCost?, discountAmount?, paymentMethod?, notes? }` → tạo hóa đơn, sinh mã `INV-...`, tính grandTotal, chuyển phiếu sang `COMPLETED` |
| `GET` | `/api/v1/invoices/:id` | `invoice.manage` or `operations.manage` | Chi tiết hóa đơn kèm chi tiết thanh toán và phiếu sửa |
| `GET` | `/api/v1/invoices/:id/print` | Authenticated | Trả về trang HTML chuẩn in ấn / xuất PDF đẹp mắt với nút `window.print()` tích hợp |
| `GET` | `/api/v1/repair-orders/:orderId/invoice` | `invoice.manage` or `operations.manage` | Tra cứu hóa đơn của phiếu sửa chữa theo `orderId` |
## User & Staff Management Endpoints
| Method | Path | Permission | Request / response |
| --- | --- | --- | --- |
| `GET` | `/api/v1/users` | `system.manage` or `operations.manage` | Danh sách nhân viên/tài khoản; lọc `search`, `role`, `isActive`, `branchId`; tính sẵn `activeRepairsCount` cho KTV |
| `GET` | `/api/v1/users/roles` | `system.manage` or `operations.manage` | Danh mục vai trò nhân viên khả dụng (`ADMIN`, `MANAGER`, `RECEPTIONIST`, `TECHNICIAN`, `WAREHOUSE_MANAGER`) |
| `POST` | `/api/v1/users` | `system.manage` or `operations.manage` | `{ username, password, fullName, roleCode, phone?, email?, branchId? }` → tạo tài khoản nhân viên mới |
| `GET` | `/api/v1/users/:id` | `system.manage` or `operations.manage` | Chi tiết tài khoản nhân sự và danh sách vai trò |
| `PATCH` | `/api/v1/users/:id` | `system.manage` or `operations.manage` | `{ fullName?, phone?, email?, roleCode?, branchId?, isActive?, password? }` → cập nhật thông tin, đổi vai trò, đổi mật khẩu hoặc khóa tài khoản |

## Customers và devices
| Method | Path | Permission | Ghi chú |
| --- | --- | --- | --- |
| `GET`, `POST` | `/api/v1/customers` | `intake.manage` | List hỗ trợ `page`, `pageSize`, `search`, `sortBy`, `sortOrder`, `includeInactive`; POST hỗ trợ kèm `username` và `password` để tạo ngay tài khoản online |
| `GET`, `PATCH` | `/api/v1/customers/:id` | `intake.manage` | GET trả kèm thông tin `account` trực tuyến; PATCH cho phép cập nhật thông tin |
| `POST` | `/api/v1/customers/:id/account` | `intake.manage` | `{ username?, password?, isActive? }` → Cấp mới tài khoản, đổi mật khẩu hoặc khóa/mở khóa tài khoản Cổng khách hàng |
| `GET`, `POST` | `/api/v1/devices` | `intake.manage` | List hỗ trợ lọc `customerId` và `search` |
| `GET`, `PATCH` | `/api/v1/devices/:id` | `intake.manage` | Thiết bị phải thuộc khách hàng active; PATCH cho phép deactivate |
Tất cả list giới hạn `pageSize` từ 1 đến 100; sort field được allowlist ở backend.
