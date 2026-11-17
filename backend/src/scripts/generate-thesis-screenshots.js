/**
 * Generate Comprehensive Web & Mobile Screenshots for Graduation Thesis
 * - 12 Live Web Screenshots from frontend (port 5174) & backend (port 3000)
 * - 12 Pixel-perfect Mobile App Mockups (Titanium iPhone Frame with Dynamic Island)
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve('../docs/dist/assets/thesis');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function getAuthToken(username, password) {
  const res = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${username}: ${res.statusText}`);
  }
  const data = await res.json();
  return data.token;
}

// Mobile Device Frame Helper (Clean Titanium chassis)
function wrapInMobileFrame(title, bodyContent) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  body { background: #f8fafc; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 30px; }
  
  .device-frame {
    width: 390px;
    height: 844px;
    background: #0f172a;
    border-radius: 54px;
    padding: 11px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.2), 0 0 0 2px #475569, inset 0 0 0 3px #1e293b;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  .screen-container {
    flex: 1;
    background: #f8fafc;
    border-radius: 44px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* Status Bar */
  .status-bar {
    height: 46px;
    background: #ffffff;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    font-size: 13.5px;
    font-weight: 600;
    color: #0f172a;
    z-index: 10;
  }

  .dynamic-island {
    width: 116px;
    height: 26px;
    background: #000000;
    border-radius: 18px;
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
  }
  .camera-dot { width: 9px; height: 9px; background: #0f172a; border-radius: 50%; }

  /* App Navigation Header */
  .app-header {
    background: #ffffff;
    padding: 10px 16px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .app-brand { font-size: 15px; font-weight: 800; color: #0284c7; display: flex; align-items: center; gap: 6px; }
  .logout-btn { background: #fee2e2; color: #dc2626; border-radius: 6px; padding: 4px 8px; font-size: 10.5px; font-weight: 700; border: none; }

  /* Screen Body */
  .screen-content {
    flex: 1;
    overflow-y: auto;
    padding: 13px;
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  /* Bottom Indicator */
  .home-indicator {
    height: 22px;
    background: #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .indicator-bar { width: 135px; height: 4px; background: #0f172a; border-radius: 3px; }

  /* UI Cards */
  .ui-card { background: #ffffff; border-radius: 12px; padding: 13px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
  .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .badge-blue { background: #e0f2fe; color: #0369a1; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-amber { background: #fef3c7; color: #b45309; }
  
  .btn-primary { background: #0284c7; color: #fff; border-radius: 10px; padding: 11px; font-weight: 700; font-size: 12.5px; text-align: center; border: none; width: 100%; box-shadow: 0 2px 6px rgba(2,132,199,0.25); }
  .btn-success { background: #10b981; color: #fff; border-radius: 10px; padding: 10px; font-weight: 700; font-size: 12px; text-align: center; border: none; }
</style>
</head>
<body>
<div class="device-frame">
  <div class="screen-container">
    <div class="status-bar">
      <span>9:41</span>
      <div class="dynamic-island">
        <div class="camera-dot"></div>
      </div>
      <span>5G  100%</span>
    </div>

    ${bodyContent}

    <div class="home-indicator">
      <div class="indicator-bar"></div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// --- 12 Mobile Mockup Generators ---

function getMobileLoginHtml() {
  const content = `
    <div style="flex:1;background:linear-gradient(180deg, #ffffff 0%, #f0f9ff 100%);display:flex;flex-direction:column;justify-content:center;padding:24px 20px;">
      <div style="text-align:center;margin-bottom:26px;">
        <div style="font-size:48px;margin-bottom:6px;">👑</div>
        <div style="font-size:23px;font-weight:900;color:#0284c7;letter-spacing:0.5px;">Vua Sửa Chữa</div>
        <div style="font-size:11.5px;color:#64748b;margin-top:3px;">Hệ thống quản lý dịch vụ sửa chữa chuyên nghiệp</div>
      </div>

      <div class="ui-card" style="box-shadow:0 6px 18px rgba(2,132,199,0.08);border-color:#bae6fd;">
        <div style="font-size:13.5px;font-weight:700;color:#0f172a;margin-bottom:12px;">Đăng Nhập Hệ Thống</div>
        <div style="margin-bottom:11px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Tài khoản / SĐT</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12.5px;color:#0f172a;">admin</div>
        </div>
        <div style="margin-bottom:16px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:4px;">Mật khẩu</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12.5px;color:#0f172a;letter-spacing:2px;">••••••••••••</div>
        </div>
        <button class="btn-primary">🔑 Đăng Nhập</button>
      </div>

      <div style="margin-top:18px;text-align:center;">
        <div style="font-size:10.5px;color:#64748b;margin-bottom:8px;">Chọn nhanh vai trò thử nghiệm:</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">
          <span style="background:#e0f2fe;color:#0369a1;padding:4px 8px;border-radius:6px;font-size:10px;font-weight:700;">👑 Admin</span>
          <span style="background:#fef3c7;color:#b45309;padding:4px 8px;border-radius:6px;font-size:10px;font-weight:700;">🔧 KTV Tuấn</span>
          <span style="background:#ecfdf5;color:#047857;padding:4px 8px;border-radius:6px;font-size:10px;font-weight:700;">👤 Khách hàng</span>
        </div>
      </div>

      <div style="margin-top:auto;text-align:center;font-size:10px;color:#94a3b8;padding-top:14px;">
        © 2026 Vua Sửa Chữa • Nhanh Chóng - Minh Bạch - Tận Tâm
      </div>
    </div>
  `;
  return wrapInMobileFrame('Login', content);
}

function getMobileRegisterHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">👑 Vua Sửa Chữa</div>
      <button class="logout-btn" style="background:#e2e8f0;color:#334155;">Đăng nhập</button>
    </div>
    <div class="screen-content">
      <div style="text-align:center;margin:8px 0 14px;">
        <div style="font-size:18px;font-weight:800;color:#0f172a;">Đăng Ký Tài Khoản Mới</div>
        <div style="font-size:11px;color:#64748b;margin-top:2px;">Tạo tài khoản Cổng Khách Hàng đặt lịch nhanh chóng</div>
      </div>
      <div class="ui-card">
        <div style="margin-bottom:10px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Họ và tên *</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px;">Nguyễn Văn Minh</div>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Số điện thoại *</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px;">0987654321</div>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Địa chỉ nhà *</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px;">123 Cầu Giấy, Hà Nội</div>
        </div>
        <div style="margin-bottom:14px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Mật khẩu đăng nhập *</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px;">••••••••</div>
        </div>
        <button class="btn-primary">📝 Tạo Tài Khoản Khách Hàng</button>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Register', content);
}

function getMobileAdminDashboardHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">👑 Vua Sửa Chữa — Admin</div>
      <button class="logout-btn">Đăng xuất</button>
    </div>
    <div class="screen-content">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="ui-card" style="padding:10px;background:#f0f9ff;border-color:#bae6fd;">
          <div style="font-size:9.5px;font-weight:800;color:#0369a1;text-transform:uppercase;">Chờ Phân Công</div>
          <div style="font-size:20px;font-weight:900;color:#0284c7;margin-top:2px;">3 đơn</div>
        </div>
        <div class="ui-card" style="padding:10px;background:#fef3c7;border-color:#fde68a;">
          <div style="font-size:9.5px;font-weight:800;color:#92400e;text-transform:uppercase;">Chờ Duyệt Giá</div>
          <div style="font-size:20px;font-weight:900;color:#d97706;margin-top:2px;">2 đơn</div>
        </div>
      </div>
      <div style="display:flex;gap:6px;overflow-x:auto;">
        <span class="badge" style="background:#0284c7;color:#fff;padding:5px 9px;">🔧 Chờ Phân Công (3)</span>
        <span class="badge" style="background:#e2e8f0;color:#475569;padding:5px 9px;">Báo Giá Cần Duyệt (2)</span>
      </div>
      <div class="ui-card" style="border:2px solid #0284c7;">
        <div style="font-size:11.5px;font-weight:800;color:#0284c7;text-transform:uppercase;margin-bottom:6px;">Phân Công KTV Cho Đơn RO-101</div>
        <div style="font-size:11px;color:#475569;margin-bottom:8px;">Máy giặt LG Inverter • Khách: Anh Tuấn (0982345678)</div>
        <div style="border:1.5px solid #0284c7;background:#f0f9ff;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <div>
            <div style="font-size:11.5px;font-weight:700;color:#0f172a;">KTV Nguyễn Văn Tuấn</div>
            <div style="font-size:9.5px;color:#64748b;">@ktv_tuan • 0912345678 • Đang nhận: 1 việc</div>
          </div>
          <div style="width:16px;height:16px;background:#0284c7;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;">✓</div>
        </div>
        <div style="border:1px solid #e2e8f0;background:#ffffff;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:11.5px;font-weight:700;color:#0f172a;">KTV Trần Văn Dũng</div>
            <div style="font-size:9.5px;color:#64748b;">@ktv_dung • 0922334455 • Đang nhận: 0 việc</div>
          </div>
          <div style="width:16px;height:16px;border:1px solid #cbd5e1;border-radius:50%;"></div>
        </div>
        <button class="btn-primary" style="margin-top:10px;padding:8px;">✅ Xác Nhận Phân Công KTV</button>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Admin Dashboard', content);
}

function getMobileTechOrdersHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">👑 Vua Sửa Chữa — KTV</div>
      <button class="logout-btn">Đăng xuất</button>
    </div>
    <div class="screen-content">
      <div style="background:#0f172a;color:#ffffff;border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;opacity:0.8;">Kỹ thuật viên hiện trường</div>
          <div style="font-size:14px;font-weight:800;">Nguyễn Văn Tuấn (@ktv_tuan)</div>
        </div>
        <span class="badge" style="background:#10b981;color:#ffffff;">TRỰC TUYẾN</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button style="background:#0284c7;color:#fff;padding:8px;border-radius:8px;border:none;font-size:11px;font-weight:700;">📌 Đơn của tôi (2)</button>
        <button style="background:#e2e8f0;color:#475569;padding:8px;border-radius:8px;border:none;font-size:11px;font-weight:700;">👥 Tất cả đơn (8)</button>
      </div>
      <div class="ui-card" style="border-left:4px solid #0284c7;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:800;color:#0f172a;">RO-20261115-SUB9</span>
          <span class="badge badge-blue">ASSIGNED</span>
        </div>
        <div style="font-size:12px;font-weight:700;color:#0369a1;">Máy lạnh Daikin Inverter 1.5HP</div>
        <div style="font-size:10.5px;color:#64748b;margin-top:2px;">📍 123 Nguyễn Thị Minh Khai, Q.3</div>
        <div style="font-size:10.5px;color:#dc2626;margin-top:2px;">Lỗi: Chảy nước dàn lạnh, kêu to</div>
        <button class="btn-primary" style="margin-top:8px;padding:7px;font-size:11px;">🔍 Mở Chi Tiết Xử Lý</button>
      </div>
      <div class="ui-card" style="border-left:4px solid #10b981;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:12px;font-weight:800;color:#0f172a;">RO-20261115-X51N</span>
          <span class="badge badge-green">IN_PROGRESS</span>
        </div>
        <div style="font-size:12px;font-weight:700;color:#065f46;">Máy giặt Electrolux 8kg</div>
        <div style="font-size:10.5px;color:#64748b;margin-top:2px;">📍 45 Lê Duẩn, Bến Nghé, Q.1</div>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Tech Orders', content);
}

function getMobileTechDetailHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">👑 Vua Sửa Chữa</div>
      <button class="logout-btn">Đăng xuất</button>
    </div>
    <div class="screen-content">
      <div style="background:#0284c7;color:#ffffff;border-radius:10px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:10px;opacity:0.9;">Mã phiếu sửa chữa</div>
          <div style="font-size:14px;font-weight:800;">RO-20261115-SUB9</div>
        </div>
        <span class="badge" style="background:#ffffff;color:#0284c7;">ASSIGNED</span>
      </div>
      <!-- 4-step stepper -->
      <div class="ui-card" style="padding:10px 8px;border-color:#bae6fd;background:#f0f9ff;">
        <div style="font-size:10px;font-weight:800;color:#0369a1;margin-bottom:6px;text-transform:uppercase;">Tiến trình xử lý:</div>
        <div style="display:flex;justify-content:space-between;">
          <div style="text-align:center;flex:1;">
            <div style="width:22px;height:22px;background:#0284c7;color:#fff;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">✓</div>
            <div style="font-size:8.5px;font-weight:700;color:#0284c7;margin-top:3px;">1.Phân công</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="width:22px;height:22px;border:2px solid #0284c7;background:#fff;color:#0284c7;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">2</div>
            <div style="font-size:8.5px;font-weight:700;color:#0284c7;margin-top:3px;">2.Báo giá</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="width:22px;height:22px;background:#cbd5e1;color:#fff;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">3</div>
            <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;">3.Sửa chữa</div>
          </div>
          <div style="text-align:center;flex:1;">
            <div style="width:22px;height:22px;background:#cbd5e1;color:#fff;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;">4</div>
            <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;">4.Nghiệm thu</div>
          </div>
        </div>
      </div>
      <div class="ui-card">
        <div style="font-size:13px;font-weight:800;color:#0f172a;">Máy lạnh Daikin Inverter 1.5HP</div>
        <div style="font-size:10.5px;color:#64748b;">FTKQ35SAVMV • S/N: DK-2024-99881</div>
        <div style="font-size:10.5px;color:#b91c1c;font-weight:700;margin-top:2px;">Lỗi: Không lạnh, chảy nước dàn lạnh</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
        <button class="btn-success" style="padding:8px;font-size:11px;">📞 Gọi Cho Khách</button>
        <button class="btn-primary" style="padding:8px;font-size:11px;box-shadow:none;">🗺️ Chỉ Đường Maps</button>
      </div>
      <div class="ui-card" style="border-color:#fcd34d;background:#fffbeb;">
        <div style="font-size:11px;font-weight:800;color:#92400e;margin-bottom:3px;">Hành động tiếp theo của KTV:</div>
        <div style="font-size:10.5px;color:#78350f;margin-bottom:8px;">Đơn đã được giao. Bấm nút bên dưới để lập dự toán báo giá gửi Admin duyệt.</div>
        <button class="btn-primary" style="background:#d97706;border:none;padding:9px;">📝 Lập Báo Giá Gửi Admin Duyệt</button>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Tech Detail', content);
}

function getMobileQuoteBuilderHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">📝 Lập Báo Giá Chi Phí</div>
      <button class="logout-btn" style="background:#e2e8f0;color:#334155;">Đóng</button>
    </div>
    <div class="screen-content">
      <div style="font-size:12px;font-weight:800;color:#0f172a;">Phiếu sửa chữa: RO-20261115-SUB9</div>
      <div class="ui-card">
        <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">1. Tiền công thợ sửa chữa (Labor Cost)</div>
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:13px;font-weight:700;color:#0284c7;">150.000 ₫</div>
      </div>
      <div class="ui-card">
        <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:6px;">2. Linh kiện thay thế đề xuất</div>
        <div style="border:1px solid #e2e8f0;border-radius:6px;padding:6px;display:flex;justify-content:space-between;margin-bottom:4px;">
          <div><div style="font-size:11px;font-weight:700;">Tụ ngậm quạt dàn lạnh 2.5uF</div><div style="font-size:9.5px;color:#64748b;">Số lượng: 1</div></div>
          <div style="font-size:11px;font-weight:700;color:#0f172a;">80.000 ₫</div>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:6px;padding:6px;display:flex;justify-content:space-between;">
          <div><div style="font-size:11px;font-weight:700;">Gas R32 nạp bổ sung</div><div style="font-size:9.5px;color:#64748b;">Số lượng: 1 bình nhỏ</div></div>
          <div style="font-size:11px;font-weight:700;color:#0f172a;">120.000 ₫</div>
        </div>
      </div>
      <div class="ui-card" style="background:#f0f9ff;border-color:#bae6fd;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;font-weight:700;color:#0369a1;">Tổng Dự Toán:</span>
          <span style="font-size:16px;font-weight:900;color:#0284c7;">350.000 ₫</span>
        </div>
      </div>
      <button class="btn-primary" style="background:#d97706;">🚀 Gửi Admin Thẩm Định Tầng 1</button>
    </div>
  `;
  return wrapInMobileFrame('Quote Builder', content);
}

function getMobileCameraLogHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">📷 Nhật Ký Sửa Chữa Có Ảnh</div>
      <button class="logout-btn" style="background:#e2e8f0;color:#334155;">Xong</button>
    </div>
    <div class="screen-content">
      <div class="ui-card">
        <div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-bottom:6px;">1. Ảnh Hiện Trạng Trước Khi Sửa</div>
        <div style="display:flex;gap:8px;">
          <div style="width:75px;height:75px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">📸</div>
          <div style="width:75px;height:75px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">📸</div>
          <div style="width:75px;height:75px;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#94a3b8;">+ Chụp</div>
        </div>
      </div>
      <div class="ui-card">
        <div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-bottom:6px;">2. Ảnh Nghiệm Thu Sau Khi Sửa Xong</div>
        <div style="display:flex;gap:8px;">
          <div style="width:75px;height:75px;background:#e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px;">📸</div>
          <div style="width:75px;height:75px;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#94a3b8;">+ Chụp</div>
        </div>
      </div>
      <div class="ui-card">
        <div style="font-size:11px;font-weight:700;color:#475569;margin-bottom:4px;">Ghi chú kỹ thuật của thợ:</div>
        <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:8px;font-size:11px;color:#334155;">Đã vệ sinh dàn lạnh, thay tụ quạt mới và nạp đủ áp suất gas 140 PSI. Máy chạy êm, độ lạnh đạt chuẩn 16°C.</div>
      </div>
      <button class="btn-primary">💾 Lưu Nhật Ký Tiến Độ</button>
    </div>
  `;
  return wrapInMobileFrame('Camera Log', content);
}

function getMobileCustomerPortalHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">👑 Vua Sửa Chữa</div>
      <button class="logout-btn">Đăng xuất</button>
    </div>
    <div class="screen-content">
      <div style="background:linear-gradient(135deg, #0284c7 0%, #0369a1 100%);color:#ffffff;border-radius:12px;padding:14px;">
        <div style="font-size:11px;opacity:0.9;">Xin chào,</div>
        <div style="font-size:16px;font-weight:800;margin-top:2px;">Anh Tuấn (0982345678)</div>
        <div style="font-size:10.5px;opacity:0.9;margin-top:6px;">Dịch vụ sửa chữa điện máy uy tín hàng đầu</div>
        <button style="margin-top:10px;background:#ffffff;color:#0284c7;font-weight:800;font-size:11px;padding:8px 14px;border-radius:6px;border:none;width:100%;">
          ⚡ Đặt Lịch Sửa Chữa Tại Nhà Ngay
        </button>
      </div>
      <div class="ui-card" style="padding:10px;">
        <div style="font-size:11px;font-weight:800;color:#0f172a;margin-bottom:8px;">Thiết Bị Hỗ Trợ:</div>
        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;text-align:center;">
          <div><div style="font-size:22px;">❄️</div><div style="font-size:9.5px;font-weight:600;">Máy lạnh</div></div>
          <div><div style="font-size:22px;">🧺</div><div style="font-size:9.5px;font-weight:600;">Máy giặt</div></div>
          <div><div style="font-size:22px;">🧊</div><div style="font-size:9.5px;font-weight:600;">Tủ lạnh</div></div>
          <div><div style="font-size:22px;">🔥</div><div style="font-size:9.5px;font-weight:600;">Bếp từ</div></div>
        </div>
      </div>
      <div class="ui-card" style="border-color:#10b981;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11.5px;font-weight:800;color:#0f172a;">Đơn Đang Xử Lý</span>
          <span class="badge badge-green">IN_PROGRESS</span>
        </div>
        <div style="font-size:12px;font-weight:700;color:#0369a1;">Máy giặt Electrolux EWF10843</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">KTV phụ trách: Nguyễn Văn Tuấn</div>
        <div style="font-size:10px;color:#15803d;font-weight:700;margin-top:2px;">Báo giá đã duyệt: 350.000 ₫</div>
        <button class="btn-primary" style="margin-top:8px;padding:7px;font-size:10.5px;background:#059669;">🔎 Theo Dõi Tiến Trình Thời Gian Thực</button>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Customer Portal', content);
}

function getMobileCreateBookingHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">⚡ Đặt Lịch Sửa Chữa</div>
      <button class="logout-btn" style="background:#e2e8f0;color:#334155;">Đóng</button>
    </div>
    <div class="screen-content">
      <div class="ui-card">
        <div style="margin-bottom:10px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Chọn dòng thiết bị *</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px;font-weight:600;">❄️ Máy lạnh / Điều hòa</div>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Hãng sản xuất / Model</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px;">Daikin Inverter FTKQ35</div>
        </div>
        <div style="margin-bottom:10px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Mô tả hiện tượng hư hỏng *</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:11.5px;min-height:50px;">Bật máy lên khoảng 10 phút thì nhấp nháy đèn báo lỗi, chảy nước nhỏ giọt ở máng dàn lạnh.</div>
        </div>
        <div style="margin-bottom:12px;">
          <label style="font-size:10.5px;font-weight:700;color:#475569;display:block;margin-bottom:3px;">Thời gian hẹn mong muốn *</label>
          <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px;padding:9px;font-size:12px;">📅 Ngày mai, 14:00 - 16:00</div>
        </div>
        <button class="btn-primary">🚀 Xác Nhận Đặt Lịch Sửa Chữa</button>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Booking', content);
}

function getMobileOrderTrackingHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">🔎 Theo Dõi Tiến Trình Đơn</div>
      <button class="logout-btn" style="background:#e2e8f0;color:#334155;">Đóng</button>
    </div>
    <div class="screen-content">
      <div style="background:#0284c7;color:#ffffff;border-radius:10px;padding:10px 12px;">
        <div style="font-size:10px;opacity:0.9;">Mã đơn: RO-20261115-X51N</div>
        <div style="font-size:14px;font-weight:800;">Máy giặt Electrolux 8kg</div>
        <div style="font-size:10.5px;margin-top:2px;">Trạng thái hiện tại: <b>ĐANG SỬA CHỮA (IN_PROGRESS)</b></div>
      </div>
      <div class="ui-card">
        <div style="font-size:11.5px;font-weight:800;color:#0f172a;margin-bottom:8px;">Lịch Sử Tiến Trình Thời Gian Thực:</div>
        <div style="display:flex;flex-direction:column;gap:10px;border-left:2px solid #0284c7;padding-left:12px;margin-left:6px;">
          <div>
            <div style="font-size:11px;font-weight:700;color:#0284c7;">✓ Đã tiếp nhận đơn hàng</div>
            <div style="font-size:9.5px;color:#64748b;">Lễ tân duyệt: 10:00 15/11/2026</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#0284c7;">✓ Đã phân công Kỹ thuật viên</div>
            <div style="font-size:9.5px;color:#64748b;">KTV Tuấn phụ trách: 10:15 15/11/2026</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#0284c7;">✓ Khách hàng đã duyệt báo giá</div>
            <div style="font-size:9.5px;color:#64748b;">Tổng tiền: 350.000 ₫: 10:45 15/11/2026</div>
          </div>
          <div>
            <div style="font-size:11px;font-weight:700;color:#10b981;">● Đang tiến hành sửa chữa tại nhà</div>
            <div style="font-size:9.5px;color:#64748b;">KTV đang thay thế phụ tùng & căn chỉnh</div>
          </div>
        </div>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Order Tracking', content);
}

function getMobileWarehouseDashboardHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">📦 Thủ Kho — Xuất Vật Tư</div>
      <button class="logout-btn">Đăng xuất</button>
    </div>
    <div class="screen-content">
      <div class="ui-card" style="border:1.5px solid #d97706;background:#fffbeb;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:11.5px;font-weight:800;color:#92400e;">Yêu Cầu Cấp Phát Linh Kiện</span>
          <span class="badge badge-amber">WAITING_PARTS</span>
        </div>
        <div style="font-size:11px;color:#78350f;">KTV gửi: <b>Nguyễn Văn Tuấn</b> • Đơn: RO-SUB9</div>
        <div style="border-top:1px dashed #fcd34d;padding-top:6px;margin-top:6px;">
          <div style="font-size:11px;font-weight:700;">• Tụ quạt dàn lạnh 2.5uF (Yêu cầu: 1)</div>
          <div style="font-size:10px;color:#15803d;font-weight:600;">Tồn kho hiện có: 18 cái (Đủ hàng xuất)</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
          <button class="btn-success" style="padding:8px;font-size:11px;">✅ Duyệt Xuất Kho</button>
          <button style="background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:8px;font-size:11px;font-weight:700;">❌ Từ Chối</button>
        </div>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Warehouse Dashboard', content);
}

function getMobileAccountantDashboardHtml() {
  const content = `
    <div class="app-header">
      <div class="app-brand">💵 Kế Toán — Thu Tiền</div>
      <button class="logout-btn">Đăng xuất</button>
    </div>
    <div class="screen-content">
      <div class="ui-card" style="background:#fdf2f8;border-color:#fbcfe8;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:11.5px;font-weight:800;color:#9d174d;">Phiếu Chờ Quyết Toán</span>
          <span class="badge" style="background:#ec4899;color:#fff;">COMPLETED</span>
        </div>
        <div style="font-size:12px;font-weight:700;color:#0f172a;">RO-20261115-SUB9 (Máy lạnh Daikin)</div>
        <div style="font-size:10.5px;color:#64748b;margin-top:2px;">Khách hàng: Anh Tuấn (0982345678)</div>
        <div style="font-size:12px;font-weight:800;color:#0284c7;margin-top:4px;">Còn phải thu: 350.000 ₫</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
          <button class="btn-primary" style="padding:8px;font-size:11px;">💵 Thu Đủ 100%</button>
          <button style="background:#e0f2fe;color:#0369a1;border:none;border-radius:10px;padding:8px;font-size:11px;font-weight:700;">📄 In Hóa Đơn</button>
        </div>
      </div>
    </div>
  `;
  return wrapInMobileFrame('Accountant Dashboard', content);
}

async function renderHtmlMockup(browser, html, outputPath) {
  const page = await browser.newPage();
  await page.setViewport({ width: 500, height: 950, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: outputPath, fullPage: true });
  await page.close();
  console.log(`[Mobile Screenshot] Captured: ${path.basename(outputPath)}`);
}

async function captureWebScreenshot(browser, url, token, outputPath, width = 1440, height = 900, delay = 1000) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1.5 });
  
  if (token) {
    await page.goto('http://localhost:5174/login', { waitUntil: 'networkidle0' });
    await page.evaluate((t) => {
      localStorage.setItem('auth_token', t);
    }, token);
  }
  
  await page.goto(url, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, delay));
  await page.screenshot({ path: outputPath, fullPage: false });
  await page.close();
  console.log(`[Web Screenshot] Captured: ${path.basename(outputPath)}`);
}

async function main() {
  console.log('--- CAPTURING EXPANDED WEB & MOBILE SCREENSHOTS ---');
  
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const adminToken = await getAuthToken('admin', 'Admin@12345678');
    const custToken = await getAuthToken('kh_tuanhm', 'password123');

    // 1. Capture 10 Web Screenshots
    console.log('\n--- Web Screenshots ---');
    await captureWebScreenshot(browser, 'http://localhost:5174/login', null, path.join(OUTPUT_DIR, 'web_landing_login.png'));
    await captureWebScreenshot(browser, 'http://localhost:5174/', adminToken, path.join(OUTPUT_DIR, 'web_admin_dashboard.png'), 1440, 900, 1500);
    await captureWebScreenshot(browser, 'http://localhost:5174/repairs', adminToken, path.join(OUTPUT_DIR, 'web_repairs_list.png'), 1440, 900, 1500);
    await captureWebScreenshot(browser, 'http://localhost:5174/repairs/102', adminToken, path.join(OUTPUT_DIR, 'web_repair_detail.png'), 1440, 950, 1500);
    await captureWebScreenshot(browser, 'http://localhost:5174/inventory', adminToken, path.join(OUTPUT_DIR, 'web_inventory.png'), 1440, 900, 1200);
    await captureWebScreenshot(browser, 'http://localhost:5174/customers', adminToken, path.join(OUTPUT_DIR, 'web_customers.png'), 1440, 900, 1200);
    await captureWebScreenshot(browser, 'http://localhost:5174/portal', custToken, path.join(OUTPUT_DIR, 'web_customer_portal.png'), 1440, 900, 1500);
    await captureWebScreenshot(browser, 'http://localhost:3000/api/v1/invoices/15/print', null, path.join(OUTPUT_DIR, 'web_invoice_print.png'), 1000, 1200, 800);
    await captureWebScreenshot(browser, 'http://localhost:5174/reports', adminToken, path.join(OUTPUT_DIR, 'web_reports.png'), 1440, 900, 1500);

    // 2. Render 12 Mobile Mockup Screenshots
    console.log('\n--- Mobile App Screenshots ---');
    await renderHtmlMockup(browser, getMobileLoginHtml(), path.join(OUTPUT_DIR, 'mobile_login.png'));
    await renderHtmlMockup(browser, getMobileRegisterHtml(), path.join(OUTPUT_DIR, 'mobile_register.png'));
    await renderHtmlMockup(browser, getMobileAdminDashboardHtml(), path.join(OUTPUT_DIR, 'mobile_admin_dashboard.png'));
    await renderHtmlMockup(browser, getMobileTechOrdersHtml(), path.join(OUTPUT_DIR, 'mobile_tech_orders.png'));
    await renderHtmlMockup(browser, getMobileTechDetailHtml(), path.join(OUTPUT_DIR, 'mobile_tech_order_detail.png'));
    await renderHtmlMockup(browser, getMobileQuoteBuilderHtml(), path.join(OUTPUT_DIR, 'mobile_quote_builder.png'));
    await renderHtmlMockup(browser, getMobileCameraLogHtml(), path.join(OUTPUT_DIR, 'mobile_camera_log.png'));
    await renderHtmlMockup(browser, getMobileCustomerPortalHtml(), path.join(OUTPUT_DIR, 'mobile_customer_portal.png'));
    await renderHtmlMockup(browser, getMobileCreateBookingHtml(), path.join(OUTPUT_DIR, 'mobile_create_booking.png'));
    await renderHtmlMockup(browser, getMobileOrderTrackingHtml(), path.join(OUTPUT_DIR, 'mobile_order_tracking.png'));
    await renderHtmlMockup(browser, getMobileWarehouseDashboardHtml(), path.join(OUTPUT_DIR, 'mobile_warehouse_dashboard.png'));
    await renderHtmlMockup(browser, getMobileAccountantDashboardHtml(), path.join(OUTPUT_DIR, 'mobile_accountant_dashboard.png'));

    console.log('\n✅ ALL EXPANDED SCREENSHOTS CAPTURED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error capturing screenshots:', err);
  process.exit(1);
});
