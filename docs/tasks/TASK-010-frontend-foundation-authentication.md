# TASK-010 — Frontend foundation và authentication
- **Trạng thái:** DONE
- **Ưu tiên:** High
- **Phụ thuộc:** TASK-004
- **Hoàn thành:** 2026-10-30

## Mục tiêu
Khởi tạo ReactJS, điều hướng, phiên đăng nhập và màn hình theo quyền.

## Tiêu chí nghiệm thu
- [x] Loading, empty, error, success được xử lý; không có nghiệp vụ trọng yếu chỉ ở frontend.

## Kết quả kiểm thử

### Build
```
✓ vite build — 30 modules transformed, 0 lỗi, 0 cảnh báo
dist/assets/index-C2aeh_B5.css   9.24 kB (gzip: 2.24 kB)
dist/assets/index-CLhXpV19.js  268.64 kB (gzip: 84.86 kB)
Built in 184ms
```

### Xử lý 4 trạng thái
| Trạng thái | Nơi thể hiện |
|---|---|
| **Loading** | `ProtectedRoute` / `GuestRoute` (spinner trong khi khôi phục session); `LoginPage` (spinner trên nút submit) |
| **Error** | `LoginPage` form error (401/422/429); `ErrorMessage` component tái sử dụng |
| **Empty** | `EmptyState` component; các placeholder page |
| **Success** | Đăng nhập → redirect `/dashboard`; `DashboardPage` hiển thị tên người dùng |

## Cấu trúc đã tạo
```
frontend/
  vite.config.js          — proxy /api → localhost:3000
  src/
    api/
      client.js           — HTTP helper (Bearer token, 401 redirect, { data, error })
      auth.js             — login(), logout(), getMe()
    contexts/
      AuthContext.jsx     — AuthProvider + useAuth() hook
    hooks/
      useApi.js           — useApi(fetchFn, deps) → { data, isLoading, error, refetch }
    components/
      Layout.jsx          — Sidebar + Header + <Outlet />
      LoadingSpinner.jsx  — Loading indicator (full-page / inline)
      ErrorMessage.jsx    — Error display với retry
      EmptyState.jsx      — Empty state display
    pages/
      LoginPage.jsx       — Form đăng nhập
      DashboardPage.jsx   — Chào mừng {fullName}
    index.css             — CSS variables, reset, layout, responsive
```
