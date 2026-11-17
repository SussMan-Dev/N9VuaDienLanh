# Architecture
## Tổng quan
```text
ReactJS SPA ── HTTPS/JSON ──> ExpressJS REST API ── SQL ──> MySQL
```
## Thành phần
- `frontend/`: ReactJS, màn hình, biểu mẫu và gọi REST API; không là nguồn quyết định nghiệp vụ.
- `backend/`: ExpressJS; xác thực, phân quyền, validation, nghiệp vụ, transaction và API.
- `database/`: MySQL; dữ liệu bền vững, ràng buộc và migration.
- `tests/`: unit, integration API/database, end-to-end luồng chính.
## Nguyên tắc
- REST versioned dưới `/api/v1`; JSON `camelCase`, cột MySQL `snake_case`.
- Backend là nguồn sự thật cho trạng thái, quyền và tổng tiền.
- Thao tác thay đổi phiếu, trạng thái, vật tư, thanh toán chạy trong transaction.
- Không trả lỗi nội bộ/database trực tiếp cho client.
