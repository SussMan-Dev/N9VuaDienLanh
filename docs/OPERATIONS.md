# Hướng dẫn Vận hành và Triển khai Hệ thống (Operations & Deployment Guide)

Hệ thống Quản lý Sửa chữa Điện máy (Electrical Repair Management) bao gồm Backend Express.js RESTful API, Frontend React (Vite SPA) và cơ sở dữ liệu quan hệ MySQL.

---

## 1. Yêu cầu Hệ thống & Môi trường

- **Hệ điều hành**: Windows 10/11, Linux (Ubuntu 20.04+) hoặc macOS.
- **Node.js**: Phiên bản `>= 20.0.0` (khuyên dùng LTS Node.js v20 hoặc v22).
- **Cơ sở dữ liệu**: MySQL 8.0+ (hỗ trợ JSON, UTC Timestamp, InnoDB Engine).
- **Trình duyệt**: Chrome, Edge, Firefox, Safari phiên bản mới nhất.

---

## 2. Cấu trúc Thư mục Dự án

```text
electrical-repair-management/
├── backend/            # ExpressJS REST API, Services, Models, Validation
│   ├── src/
│   │   ├── config/     # Đọc cấu hình từ biến môi trường
│   │   ├── db/         # MySQL Connection Pool
│   │   ├── lib/        # State Machine, Password, Validation, Pagination
│   │   ├── middleware/ # Authentication, Rate Limit, Error Handling
│   │   ├── routes/     # Auth, Customers, Devices, Repairs, Inventory, Reports
│   │   ├── services/   # Business Logic (Workflow, Inventory, Billing, Warranty)
│   │   └── scripts/    # Integration & E2E verification test suites
├── frontend/           # React 18, Vite SPA, Context API, CSS Variables
│   ├── src/
│   │   ├── api/        # Client HTTP layer kết nối backend
│   │   ├── components/ # Layout, Header, Sidebar, Loading, Error, Empty
│   │   ├── contexts/   # AuthContext (quản lý phiên đăng nhập và quyền)
│   │   ├── pages/      # Dashboard, Customers, Repairs, Inventory, Reports, Login
│   │   └── utils/      # Format tiền tệ, ngày giờ, nhãn badge trạng thái
├── database/           # Dữ liệu & Migrations
│   ├── migrations/     # Các script SQL migration có thứ tự
│   └── scripts/        # Script backup & restore tự động
└── docs/               # Tài liệu đặc tả, kiến trúc, quy tắc, task & nhật ký
```

---

## 3. Hướng dẫn Khởi chạy Hệ thống

### 3.1. Cấu hình Cơ sở dữ liệu MySQL
1. Khởi động dịch vụ MySQL Server.
2. Tạo database:
   ```sql
   CREATE DATABASE electrical_repair_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Chạy các file migrations theo thứ tự:
   - `database/migrations/202610270001_initial_schema.sql`
   - `database/migrations/202610270002_auth_sessions_and_permissions.sql`
   - `database/migrations/202610270003_devices_active_flag.sql`

### 3.2. Cấu hình và Chạy Backend
1. Chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Tạo file `.env` từ `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Cấu hình thông số kết nối:
   ```env
   NODE_ENV=development
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=electrical_repair_management
   LOG_LEVEL=info
   ```
3. Cài đặt thư viện:
   ```bash
   npm install
   ```
4. Khởi tạo tài khoản Quản trị viên ban đầu:
   ```bash
   npm run bootstrap:admin
   ```
5. Chạy backend server (chế độ phát triển):
   ```bash
   npm run dev
   ```
   Backend sẽ lắng nghe tại `http://localhost:3000`. Endpoint kiểm tra sức khỏe hệ thống: `http://localhost:3000/health`.

### 3.3. Cấu hình và Chạy Frontend (Web)
1. Mở cửa sổ terminal mới và chuyển vào thư mục frontend:
   ```bash
   cd frontend
   npm install
   ```
2. Chạy ứng dụng giao diện:
   ```bash
   npm run dev
   ```
   Ứng dụng mở tại `http://localhost:5173` (được cấu hình proxy tự động chuyển tiếp API `/api/v1` sang `http://localhost:3000`).

### 3.4. Cấu hình và Chạy Ứng dụng Di động (Mobile App)
1. Chuyển vào thư mục `mobile`:
   ```bash
   cd mobile
   npm install
   ```
2. Khởi chạy Metro Bundler với Expo:
   ```bash
   npx expo start -c
   ```
3. **Chạy thử nghiệm trên điện thoại thật qua Expo Go**:
   - Cài đặt app **Expo Go** trên Android (Google Play) hoặc iOS (App Store).
   - Đảm bảo điện thoại và máy tính kết nối chung mạng Wi-Fi LAN (ví dụ: `192.168.1.101`).
   - Mở camera hoặc Expo Go quét mã QR hiển thị ở terminal.
   - Tại trang Đăng nhập, có sẵn bộ nút **1-click điền nhanh** 5 tài khoản mẫu và nút cấu hình IP máy chủ nếu địa chỉ LAN thay đổi.
   - Nút **"🚪 Đăng xuất"** được tích hợp ở góc trên cùng bên phải tất cả các màn hình chính để dễ dàng chuyển đổi qua lại giữa các vai trò.

---

## 4. Tài khoản Mặc định & Ma trận Phân quyền

### 4.1. Tài khoản mặc định sau Bootstrap & Seed mẫu
- **Quản trị viên**: `admin` / `Admin@12345678`
- **Kỹ thuật viên**: `ktv_dung` / `password123`
- **Lễ tân**: `letan_mai` / `password123`
- **Thủ kho**: `thukho_an` / `password123`
- **Kế toán**: `ketoan_hoa` / `password123`

### 4.2. Ma trận Vai trò & Quyền hạn (6 Roles RBAC)

| Vai trò | Phân quyền kỹ thuật | Phạm vi truy cập & Hành động cho phép |
| :--- | :--- | :--- |
| **ADMIN** | `*` (Toàn quyền) | Quản lý toàn bộ hệ thống, phân quyền, thẩm định báo giá tầng 1 trên Web & Mobile App. |
| **MANAGER** | `operations.manage`, `inventory.manage`, `reports.view` | Phân công KTV, thẩm định báo giá, duyệt override, xem báo cáo toàn hệ thống. |
| **RECEPTIONIST** | `intake.manage` | Tiếp nhận đơn trực tiếp & trực tuyến, duyệt đơn `PENDING` thành `ACCEPTED` hoặc từ chối `REJECTED`, bàn giao `DELIVERED`. |
| **TECHNICIAN** | `repair.manage` | Chẩn đoán, lập báo giá trên Mobile, chụp ảnh trước/sau sửa chữa, yêu cầu linh kiện kho, hoàn tất sửa chữa (`COMPLETED`). |
| **WAREHOUSE_STAFF**| `inventory.manage` | Tiếp nhận yêu cầu linh kiện, kiểm tra tồn kho, duyệt và xuất kho nguyên tử, nhập kho vật tư. |
| **ACCOUNTANT** | `billing.manage` | Lập hóa đơn PDF, thu tiền đợt 1/đợt 2, ghi nhận thanh toán đủ 100% để chuyển phiếu sang `PAID`. |
| **CUSTOMER** | `customer.self_service`| Đặt lịch sửa chữa tại nhà có ảnh đính kèm, theo dõi tiến trình 10 giai đoạn, duyệt/từ chối báo giá 1 chạm, ví thẻ bảo hành điện tử. |

---

## 5. Kịch bản Kiểm thử Toàn diện

Dự án cung cấp bộ kiểm thử đa tầng đảm bảo không xảy ra hồi quy (zero regression):

1. **Unit & State Machine Tests**:
   ```bash
   cd backend && npm test
   ```
   *Kiểm tra 34 test cases: máy trạng thái (state machine), validation payload, tính toán công nợ và ngày bảo hành.*

2. **Integration Tests trên MySQL thật**:
   ```bash
   cd backend
   node src/scripts/verify-repair-orders-integration.js
   node src/scripts/verify-workflow-integration.js
   node src/scripts/verify-inventory-integration.js
   node src/scripts/verify-billing-warranty-integration.js
   ```

3. **End-to-End (E2E) Flow Test**:
   ```bash
   cd backend && npm run test:e2e
   ```
   *Mô phỏng toàn bộ hành trình: Khách hàng → Tiếp nhận máy → Phân công → Chẩn đoán → Lập báo giá → Khách duyệt → Xuất kho linh kiện → Sửa chữa → Chặn giao khi nợ → Thu tiền đủ → Bàn giao → Cấp bảo hành → Bảo hành lại.*

4. **Kiểm tra Frontend Build & Lint**:
   ```bash
   cd frontend
   npm run lint
   npm run build
   ```

5. **Kiểm tra Mobile App TypeScript Type-Safety**:
   ```bash
   cd mobile
   npx tsc --noEmit
   ```
   *Đảm bảo 0 lỗi kiểu dữ liệu trên toàn bộ 15 màn hình di động, Context, API client.*

6. **Kiểm thử Liên thông Toàn diện Web ↔ Mobile E2E (12 bước)**:
   ```bash
   cd backend
   node --env-file=.env src/scripts/verify-mobile-e2e.js
   ```
   *Kiểm tra liên thông 12 bước nghiệp vụ giữa ứng dụng di động và hệ thống quản trị Web.*

7. **Đóng gói File cài đặt APK Android Độc lập**:
   ```bash
   cd mobile
   npx eas-cli build -p android --profile preview
   ```
   *Hệ thống dịch file `.apk` độc lập qua EAS Build, có thể tải về cài trực tiếp vào điện thoại mà không cần chạy máy chủ phát triển.*

---

## 6. Quy trình Sao lưu & Phục hồi (Backup & Restore)

### 6.1. Sao lưu Cơ sở dữ liệu (Backup)
Sử dụng công cụ `mysqldump` để tạo bản sao lưu an toàn bao gồm cả cấu trúc schema và dữ liệu:
```powershell
# Chạy script PowerShell
.\database\scripts\backup.ps1
```
Hoặc câu lệnh trực tiếp:
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe" -u root -p electrical_repair_management > backup_YYYYMMDD_HHMMSS.sql
```

### 6.2. Phục hồi Cơ sở dữ liệu (Restore)
Khi xảy ra sự cố cần phục hồi:
```powershell
# Chạy script PowerShell khôi phục từ file sao lưu
.\database\scripts\restore.ps1 -BackupFile .\backups\backup_20261030_170000.sql
```
Hoặc câu lệnh trực tiếp:
```bash
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p electrical_repair_management < backup_20261030_170000.sql
```

---

## 7. Xử lý Sự cố Thường gặp (Troubleshooting)

1. **Lỗi kết nối MySQL (`ECONNREFUSED` / `ER_ACCESS_DENIED_ERROR`)**:
   - Kiểm tra service MySQL Server đang chạy (`Get-Service MySQL*` trong PowerShell).
   - Kiểm tra lại `DB_USER` và `DB_PASSWORD` trong file `.env`.
2. **Lỗi xung đột cổng (`EADDRINUSE: 3000`)**:
   - Đổi `PORT=3001` trong file `.env` hoặc tắt tiến trình đang chiếm cổng:
     `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process`
3. **Phiên đăng nhập hết hạn (HTTP 401)**:
   - Hệ thống tự động xóa token và chuyển hướng về màn hình đăng nhập `/login`.
   - Đăng nhập lại với tài khoản hợp lệ.
4. **Không thể chuyển trạng thái phiếu sang `DELIVERED` (HTTP 409)**:
   - Đây là quy tắc nghiệp vụ cốt lõi: Thiết bị chỉ được giao khi phiếu sửa chữa đã thanh toán đủ (`balance = 0`). Nhân viên cần ghi nhận thanh toán trước khi bàn giao.
5. **App điện thoại báo "Lỗi kết nối máy chủ" / Không thể đăng nhập**:
   - Điện thoại thật không thể truy cập qua `localhost` hoặc `127.0.0.1`.
   - Cần đảm bảo điện thoại và máy tính kết nối chung mạng Wi-Fi LAN.
   - Kiểm tra IP máy tính qua lệnh `ipconfig` (ví dụ `192.168.1.101`).
   - Trên màn hình Đăng nhập của App Mobile, bấm nút **"⚙️ Cấu hình máy chủ"** và nhập `http://<IP_LAN_CUA_MAY_TINH>:3000` (ví dụ: `http://192.168.1.101:3000`), sau đó bấm "Kiểm tra kết nối".
   - Kiểm tra Windows Defender Firewall cho phép cổng 3000 nhận kết nối từ mạng nội bộ.

