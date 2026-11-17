/**
 * Generate Enterprise-Standard High-Resolution UML Diagrams
 * - General Use Case Diagram (Standard UML, No emojis, Clean stick-figures & ovals)
 * - Two-tier Quote Approval Use Case Diagram (Clean UML, <<include>>, <<extend>>)
 * - 10-Stage Activity Swimlane Diagram (Professional enterprise layout)
 * - Quote Flow Activity Diagram
 * - Atomic Parts Flow Activity Diagram
 * - Enterprise-Standard UML Class Diagram (3-compartment boxes, exact enterprise types, multiplicities 1..*, 0..*, composition diamonds)
 */

import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUTPUT_DIR = path.resolve('../docs/dist/assets/thesis');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function renderHtmlToPng(browser, html, outputPath, width = 1440, height = 950) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: outputPath, fullPage: true });
  await page.close();
  console.log(`[Diagram] Rendered: ${path.basename(outputPath)}`);
}

// Stick figure SVG generator
function stickFigureSvg(label, roleText = '') {
  return `
    <div style="display:flex;flex-direction:column;align-items:center;width:130px;text-align:center;">
      <svg width="46" height="74" viewBox="0 0 50 80" fill="none" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <!-- Head -->
        <circle cx="25" cy="14" r="10" fill="#ffffff" />
        <!-- Body -->
        <line x1="25" y1="24" x2="25" y2="52" />
        <!-- Arms -->
        <line x1="8" y1="36" x2="42" y2="36" />
        <!-- Left Leg -->
        <line x1="25" y1="52" x2="12" y2="76" />
        <!-- Right Leg -->
        <line x1="25" y1="52" x2="38" y2="76" />
      </svg>
      <div style="font-size:12.5px;font-weight:700;color:#0f172a;margin-top:4px;font-family:'Segoe UI',sans-serif;">${label}</div>
      ${roleText ? `<div style="font-size:10.5px;color:#64748b;font-family:'Segoe UI',sans-serif;">${roleText}</div>` : ''}
    </div>
  `;
}

// Diagram 1: Enterprise General Use Case (No icons/emojis, Standard UML)
function getGeneralUseCaseHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #ffffff; padding: 30px; display: flex; justify-content: center; }
  .canvas { width: 1360px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; padding: 28px; position: relative; }
  
  .diagram-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
  .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta { font-size: 12px; color: #475569; margin-top: 3px; }

  .layout { display: flex; justify-content: space-between; align-items: stretch; position: relative; }
  
  .actors-side { width: 140px; display: flex; flex-direction: column; justify-content: space-around; gap: 40px; z-index: 2; padding: 10px 0; }
  
  .system-boundary {
    flex: 1;
    margin: 0 20px;
    border: 2px solid #1e293b;
    background: #ffffff;
    border-radius: 4px;
    padding: 24px 20px;
    position: relative;
    box-shadow: inset 0 0 12px rgba(0,0,0,0.02);
  }
  
  .system-title {
    position: absolute;
    top: -12px;
    left: 24px;
    background: #ffffff;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .packages-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px 20px;
  }

  .package-box {
    border: 1px dashed #64748b;
    border-radius: 4px;
    padding: 10px 12px;
    background: #fafafa;
  }
  
  .package-header {
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
    margin-bottom: 8px;
    letter-spacing: 0.3px;
  }

  /* Standard UML Use Case Oval */
  .uc-oval {
    background: #ffffff;
    border: 1.5px solid #1e293b;
    border-radius: 50px;
    padding: 6px 12px;
    font-size: 11.5px;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
    margin-bottom: 8px;
    line-height: 1.3;
  }
  .uc-oval:last-child { margin-bottom: 0; }
  .uc-id { font-size: 9.5px; font-weight: bold; color: #475569; display: block; margin-bottom: 1px; }

  /* Diagram Legend */
  .uml-legend {
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid #cbd5e1;
    display: flex;
    justify-content: center;
    gap: 30px;
    font-size: 11px;
    color: #475569;
  }
  .legend-item { display: flex; align-items: center; gap: 8px; }
  .legend-line { width: 30px; height: 1.5px; background: #1e293b; }
</style>
</head>
<body>
<div class="canvas">
  <div class="diagram-header">
    <div class="title">Sơ Đồ Use Case Tổng Thể Hệ Thống (Standard UML Use Case Diagram)</div>
    <div class="meta">Hệ Thống Quản Lý Dịch Vụ Sửa Chữa Điện Máy & Điện Lạnh Vua Sửa Chữa • Chuẩn UML 2.5</div>
  </div>

  <div class="layout">
    <!-- Left Actors -->
    <div class="actors-side">
      ${stickFigureSvg('Khách Hàng', '«Actor» Customer')}
      ${stickFigureSvg('Lễ Tân', '«Actor» Receptionist')}
      ${stickFigureSvg('Quản Trị Viên', '«Actor» Admin')}
    </div>

    <!-- System Boundary -->
    <div class="system-boundary">
      <div class="system-title">System: Vua Sửa Chữa Management System</div>

      <div class="packages-grid">
        <!-- Package 1: Authentication -->
        <div class="package-box">
          <div class="package-header">Phân Hệ Xác Thực & Tài Khoản</div>
          <div class="uc-oval"><span class="uc-id">UC01</span>Đăng nhập & Phiên đa vai trò</div>
          <div class="uc-oval"><span class="uc-id">UC02</span>Đăng ký tài khoản Khách hàng</div>
          <div class="uc-oval"><span class="uc-id">UC03</span>Đổi mật khẩu & Thu hồi Session</div>
          <div class="uc-oval"><span class="uc-id">UC04</span>Quản trị phân quyền người dùng</div>
        </div>

        <!-- Package 2: Intake & Assignment -->
        <div class="package-box">
          <div class="package-header">Phân Hệ Tiếp Nhận & Phân Công</div>
          <div class="uc-oval"><span class="uc-id">UC05</span>Khách đặt lịch sửa chữa & gửi ảnh</div>
          <div class="uc-oval"><span class="uc-id">UC06</span>Tiếp nhận đơn (ACCEPTED / REJECTED)</div>
          <div class="uc-oval"><span class="uc-id">UC07</span>Admin phân công KTV theo tên</div>
          <div class="uc-oval"><span class="uc-id">UC08</span>Đăng ký & Quản lý thiết bị</div>
        </div>

        <!-- Package 3: Two-tier Quote Approval -->
        <div class="package-box">
          <div class="package-header">Phân Hệ Thẩm Định Báo Giá 2 Tầng</div>
          <div class="uc-oval"><span class="uc-id">UC09</span>KTV lập dự toán chi phí</div>
          <div class="uc-oval"><span class="uc-id">UC10</span>Admin thẩm định Báo giá Tầng 1</div>
          <div class="uc-oval"><span class="uc-id">UC11</span>Khách hàng duyệt Báo giá Tầng 2</div>
          <div class="uc-oval"><span class="uc-id">UC12</span>Lập & thẩm định báo giá bổ sung</div>
        </div>

        <!-- Package 4: Field Tech Operations -->
        <div class="package-box">
          <div class="package-header">Phân Hệ Sửa Chữa Hiện Trường</div>
          <div class="uc-oval"><span class="uc-id">UC13</span>Nhận đơn & Tra cứu bản đồ/liên hệ</div>
          <div class="uc-oval"><span class="uc-id">UC14</span>Thực hiện sửa chữa (IN_PROGRESS)</div>
          <div class="uc-oval"><span class="uc-id">UC15</span>Ghi nhật ký tiến độ & Chụp ảnh</div>
          <div class="uc-oval"><span class="uc-id">UC16</span>Nghiệm thu hoàn tất (COMPLETED)</div>
        </div>

        <!-- Package 5: Inventory Management -->
        <div class="package-box">
          <div class="package-header">Phân Hệ Quản Lý Kho Vật Tư</div>
          <div class="uc-oval"><span class="uc-id">UC17</span>KTV yêu cầu cấp phát linh kiện</div>
          <div class="uc-oval"><span class="uc-id">UC18</span>Thủ kho duyệt & Xuất kho nguyên tử</div>
          <div class="uc-oval"><span class="uc-id">UC19</span>Nhập kho & Cảnh báo tồn tối thiểu</div>
          <div class="uc-oval"><span class="uc-id">UC20</span>Truy vết lịch sử Thẻ kho (ISSUE/RECEIPT)</div>
        </div>

        <!-- Package 6: Finance & Warranty -->
        <div class="package-box">
          <div class="package-header">Phân Hệ Kế Toán & Bảo Hành</div>
          <div class="uc-oval"><span class="uc-id">UC21</span>Lập hóa đơn thanh toán (Invoice)</div>
          <div class="uc-oval"><span class="uc-id">UC22</span>Ghi nhận thu tiền & Quyết toán nợ</div>
          <div class="uc-oval"><span class="uc-id">UC23</span>Bàn giao thiết bị cho khách (DELIVERED)</div>
          <div class="uc-oval"><span class="uc-id">UC24</span>Quản lý bảo hành & Báo cáo KPI</div>
        </div>
      </div>
    </div>

    <!-- Right Actors -->
    <div class="actors-side">
      ${stickFigureSvg('Kỹ Thuật Viên', '«Actor» Technician')}
      ${stickFigureSvg('Thủ Kho', '«Actor» Warehouse Staff')}
      ${stickFigureSvg('Kế Toán', '«Actor» Accountant')}
    </div>
  </div>

  <div class="uml-legend">
    <div class="legend-item"><div class="legend-line"></div> <span>Đường liên kết tương tác (Association Line) giữa Tác nhân và Use Case</span></div>
    <div class="legend-item"><div style="border:1.5px solid #1e293b;border-radius:20px;padding:2px 10px;font-size:10px;font-weight:600;">Use Case</div> <span>Ca sử dụng (Use Case Oval)</span></div>
    <div class="legend-item"><span><b>System Boundary:</b> Ranh giới chức năng hệ thống phần mềm</span></div>
  </div>
</div>
</body>
</html>`;
}

// Diagram 2: Two-tier Quote Approval Use Case (Clean Standard UML)
function getQuoteApprovalUseCaseHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #ffffff; padding: 30px; display: flex; justify-content: center; }
  .canvas { width: 1260px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; padding: 28px; }
  
  .diagram-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 24px; }
  .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
  .meta { font-size: 12px; color: #475569; margin-top: 2px; }

  .layout { display: flex; justify-content: space-between; align-items: center; }
  .actor-col { width: 150px; text-align: center; }

  .boundary {
    flex: 1;
    margin: 0 30px;
    border: 2px solid #1e293b;
    border-radius: 4px;
    padding: 24px;
    position: relative;
    background: #ffffff;
  }
  .boundary-title {
    position: absolute;
    top: -12px;
    left: 20px;
    background: #ffffff;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
  }

  .flow-list { display: flex; flex-direction: column; gap: 14px; align-items: center; }

  .uc-oval {
    background: #ffffff;
    border: 1.5px solid #1e293b;
    border-radius: 50px;
    padding: 8px 24px;
    font-size: 12px;
    font-weight: 600;
    color: #0f172a;
    text-align: center;
    width: 480px;
  }
  .uc-id { font-size: 10px; font-weight: bold; color: #475569; margin-right: 4px; }

  .relation-label {
    font-size: 11px;
    font-weight: 700;
    color: #334155;
    font-style: italic;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .arrow-line { width: 1.5px; height: 16px; background: #64748b; border-left: 1.5px dashed #64748b; margin: 0 auto; }
</style>
</head>
<body>
<div class="canvas">
  <div class="diagram-header">
    <div class="title">Sơ Đồ Use Case Phân Hệ Thẩm Định Báo Giá 2 Tầng (Standard UML)</div>
    <div class="meta">Cơ chế phê duyệt kép: KTV lập ➔ Admin thẩm định Tầng 1 ➔ Khách hàng duyệt Tầng 2</div>
  </div>

  <div class="layout">
    <!-- Left Actor: KTV -->
    <div class="actor-col">
      ${stickFigureSvg('Kỹ Thuật Viên', '«Primary Actor»')}
    </div>

    <!-- Subsystem Boundary -->
    <div class="boundary">
      <div class="boundary-title">Subsystem: Two-Tier Quote Approval</div>
      <div class="flow-list">
        <div class="uc-oval"><span class="uc-id">UC09:</span>Lập Báo Giá Dự Toán (Công thợ + Linh kiện)</div>
        
        <div class="relation-label">«include» ⬇ (Chuyển sang AWAITING_ADMIN_APPROVAL)</div>

        <div class="uc-oval"><span class="uc-id">UC10:</span>Admin Thẩm Định Báo Giá Tầng 1</div>

        <div class="relation-label">«include» ⬇ (Khi Admin duyệt ➔ AWAITING_CUSTOMER_APPROVAL)</div>

        <div class="uc-oval"><span class="uc-id">UC11:</span>Khách Hàng Phê Duyệt Báo Giá Tầng 2</div>

        <div class="relation-label">«include» ⬇ (Khi Khách duyệt ➔ APPROVED, chốt trần chi phí)</div>

        <div class="uc-oval"><span class="uc-id">UC14:</span>Bắt Đầu Thực Hiện Sửa Chữa (IN_PROGRESS)</div>

        <div class="relation-label">«extend» ⬇ (Khi phát sinh sự cố kỹ thuật ngoài dự kiến)</div>

        <div class="uc-oval"><span class="uc-id">UC12:</span>Lập & Thẩm Định Báo Giá Bổ Sung (is_supplemental = true)</div>
      </div>
    </div>

    <!-- Right Actors: Admin & Customer -->
    <div class="actor-col" style="display:flex;flex-direction:column;gap:60px;">
      ${stickFigureSvg('Quản Trị Viên', '«Reviewer 1» Admin')}
      ${stickFigureSvg('Khách Hàng', '«Reviewer 2» Customer')}
    </div>
  </div>
</div>
</body>
</html>`;
}

// Diagram 6: Enterprise-Standard UML Class Diagram (3 compartments, standard types, multiplicities, composition diamonds)
function getEnterpriseClassDiagramHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Consolas', 'Courier New', monospace; }
  body { background: #ffffff; padding: 30px; display: flex; justify-content: center; }
  .canvas { width: 1480px; background: #ffffff; border: 1.5px solid #1e293b; border-radius: 4px; padding: 26px; }

  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 24px; font-family: 'Segoe UI', Arial, sans-serif; }
  .title { font-size: 21px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
  .meta { font-size: 12px; color: #475569; margin-top: 3px; }

  /* Enterprise UML Class Grid */
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

  .uml-box {
    border: 1.5px solid #0f172a;
    background: #ffffff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.04);
  }

  .box-title {
    background: #f8fafc;
    border-bottom: 1.5px solid #0f172a;
    padding: 6px 8px;
    text-align: center;
    font-family: 'Segoe UI', Arial, sans-serif;
  }
  .stereotype { font-size: 9.5px; font-style: italic; color: #475569; }
  .class-name { font-size: 13px; font-weight: 800; color: #0f172a; }

  .box-section {
    padding: 6px 8px;
    font-size: 10.5px;
    line-height: 1.45;
  }
  .attrs { border-bottom: 1px solid #0f172a; background: #ffffff; min-height: 110px; }
  .methods { background: #fafafa; min-height: 65px; color: #0f172a; }

  .line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
  .vis { font-weight: bold; width: 10px; display: inline-block; color: #334155; }
  .kw { color: #0f172a; font-weight: 600; }
  .t { color: #475569; }

  .relations-panel {
    margin-top: 24px;
    border: 1.5px solid #0f172a;
    background: #f8fafc;
    padding: 14px 18px;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.6;
    color: #1e293b;
  }
  .rel-title { font-weight: 800; text-transform: uppercase; margin-bottom: 6px; color: #0f172a; }
</style>
</head>
<body>
<div class="canvas">
  <div class="header">
    <div class="title">Biểu Đồ Lớp Cốt Lõi Hệ Thống (Enterprise UML Class Diagram)</div>
    <div class="meta">Chuẩn Mô Hình Hóa Phần Mềm Doanh Nghiệp (OMG UML 2.5 Specification) • Vua Sửa Chữa</div>
  </div>

  <div class="grid">
    <!-- User -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">User</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>username: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>passwordHash: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>fullName: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>phone: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>role: <span class="t">UserRoleEnum</span></div>
        <div class="line"><span class="vis">-</span>isActive: <span class="t">Boolean</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>authenticate(pwd: String): <span class="t">Boolean</span></div>
        <div class="line"><span class="vis">+</span>hasPermission(p: String): <span class="t">Boolean</span></div>
        <div class="line"><span class="vis">+</span>changePassword(newPwd: String): <span class="t">Void</span></div>
      </div>
    </div>

    <!-- Customer -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">Customer</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>userId: <span class="t">Long?</span></div>
        <div class="line"><span class="vis">-</span>fullName: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>phone: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>email: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>address: <span class="t">String</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>registerDevice(dto: DeviceDTO): <span class="t">Device</span></div>
        <div class="line"><span class="vis">+</span>createBooking(dto: BookingDTO): <span class="t">Order</span></div>
      </div>
    </div>

    <!-- Device -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">Device</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>customerId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>deviceType: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>brand: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>model: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>serialNumber: <span class="t">String</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>getRepairHistory(): <span class="t">List&lt;RepairOrder&gt;</span></div>
        <div class="line"><span class="vis">+</span>isWarrantyActive(): <span class="t">Boolean</span></div>
      </div>
    </div>

    <!-- RepairOrder (Aggregate Root) -->
    <div class="uml-box" style="border-width:2px;">
      <div class="box-title" style="background:#e2e8f0;">
        <div class="stereotype">«Aggregate Root»</div>
        <div class="class-name">RepairOrder</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>code: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>customerId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>deviceId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>repairStatus: <span class="t">RepairStatusEnum</span></div>
        <div class="line"><span class="vis">-</span>reportedIssue: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>laborCost: <span class="t">BigDecimal</span></div>
        <div class="line"><span class="vis">-</span>partsCost: <span class="t">BigDecimal</span></div>
        <div class="line"><span class="vis">-</span>totalAmount: <span class="t">BigDecimal</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>transitionTo(st: RepairStatus): <span class="t">Void</span></div>
        <div class="line"><span class="vis">+</span>assignTechnician(u: User): <span class="t">Void</span></div>
        <div class="line"><span class="vis">+</span>calculateTotals(): <span class="t">BigDecimal</span></div>
      </div>
    </div>

    <!-- Quote -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">Quote</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>repairOrderId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>version: <span class="t">Integer</span></div>
        <div class="line"><span class="vis">-</span>isSupplemental: <span class="t">Boolean</span></div>
        <div class="line"><span class="vis">-</span>laborCost: <span class="t">BigDecimal</span></div>
        <div class="line"><span class="vis">-</span>adminApprovalStatus: <span class="t">ApprovalStatus</span></div>
        <div class="line"><span class="vis">-</span>customerApprovalStatus: <span class="t">ApprovalStatus</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>approveByAdmin(admin: User): <span class="t">Void</span></div>
        <div class="line"><span class="vis">+</span>approveByCustomer(): <span class="t">Void</span></div>
      </div>
    </div>

    <!-- QuoteItem -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">QuoteItem</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>quoteId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>itemType: <span class="t">QuoteItemTypeEnum</span></div>
        <div class="line"><span class="vis">-</span>name: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>quantity: <span class="t">Integer</span></div>
        <div class="line"><span class="vis">-</span>unitPrice: <span class="t">BigDecimal</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>getSubtotal(): <span class="t">BigDecimal</span></div>
      </div>
    </div>

    <!-- RepairLog -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">RepairLog</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>repairOrderId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>technicianUserId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>notes: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>imagesBefore: <span class="t">List&lt;String&gt;</span></div>
        <div class="line"><span class="vis">-</span>imagesAfter: <span class="t">List&lt;String&gt;</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>attachImage(url: String): <span class="t">Void</span></div>
      </div>
    </div>

    <!-- PartsRequest -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">PartsRequest</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>repairOrderId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>technicianUserId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>status: <span class="t">PartsRequestStatus</span></div>
        <div class="line"><span class="vis">-</span>rejectionReason: <span class="t">String?</span></div>
        <div class="line"><span class="vis">-</span>issuedAt: <span class="t">LocalDateTime?</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>issueAtomic(user: User): <span class="t">Boolean</span></div>
        <div class="line"><span class="vis">+</span>reject(reason: String): <span class="t">Void</span></div>
      </div>
    </div>

    <!-- InventoryItem -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">InventoryItem</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>sku: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>name: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>category: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>stockQuantity: <span class="t">Integer</span></div>
        <div class="line"><span class="vis">-</span>unitPrice: <span class="t">BigDecimal</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>deductStock(qty: Integer): <span class="t">Void</span></div>
        <div class="line"><span class="vis">+</span>isUnderMinStock(): <span class="t">Boolean</span></div>
      </div>
    </div>

    <!-- Invoice -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">Invoice</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>invoiceNumber: <span class="t">String</span></div>
        <div class="line"><span class="vis">-</span>repairOrderId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>subtotal: <span class="t">BigDecimal</span></div>
        <div class="line"><span class="vis">-</span>taxAmount: <span class="t">BigDecimal</span></div>
        <div class="line"><span class="vis">-</span>grandTotal: <span class="t">BigDecimal</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>markPaid(): <span class="t">Void</span></div>
        <div class="line"><span class="vis">+</span>generatePdf(): <span class="t">ByteArray</span></div>
      </div>
    </div>

    <!-- Payment -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">Payment</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>repairOrderId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>amount: <span class="t">BigDecimal</span></div>
        <div class="line"><span class="vis">-</span>paymentMethod: <span class="t">PaymentMethodEnum</span></div>
        <div class="line"><span class="vis">-</span>paidAt: <span class="t">LocalDateTime</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>recordReceipt(by: User): <span class="t">Void</span></div>
      </div>
    </div>

    <!-- WarrantyClaim -->
    <div class="uml-box">
      <div class="box-title">
        <div class="stereotype">«Entity»</div>
        <div class="class-name">WarrantyClaim</div>
      </div>
      <div class="box-section attrs">
        <div class="line"><span class="vis">-</span>id: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>repairOrderId: <span class="t">Long</span></div>
        <div class="line"><span class="vis">-</span>warrantyMonths: <span class="t">Integer</span></div>
        <div class="line"><span class="vis">-</span>startDate: <span class="t">LocalDate</span></div>
        <div class="line"><span class="vis">-</span>endDate: <span class="t">LocalDate</span></div>
      </div>
      <div class="box-section methods">
        <div class="line"><span class="vis">+</span>isValidAt(d: LocalDate): <span class="t">Boolean</span></div>
      </div>
    </div>
  </div>

  <div class="relations-panel">
    <div class="rel-title">Quy Chuẩn Quan Hệ UML (UML Relationship Multiplicities & Stereotypes):</div>
    <div>• <b>Customer</b> (1) ──── (0..*) <b>Device</b> [Association 1-n: Một khách hàng có thể sở hữu nhiều thiết bị điện máy]</div>
    <div>• <b>Customer</b> (1) ──── (0..*) <b>RepairOrder</b> [Association 1-n: Một khách hàng có thể mở nhiều phiếu sửa chữa]</div>
    <div>• <b>Device</b> (1) ──── (0..*) <b>RepairOrder</b> [Association 1-n: Một thiết bị có thể sửa chữa nhiều lần]</div>
    <div>• <b>RepairOrder</b> (1) ◆──── (0..*) <b>Quote</b> [Composition: Báo giá thuộc quyền sở hữu của Phiếu sửa chữa]</div>
    <div>• <b>Quote</b> (1) ◆──── (1..*) <b>QuoteItem</b> [Composition: Mỗi báo giá có ít nhất một hạng mục công hoặc linh kiện]</div>
    <div>• <b>RepairOrder</b> (1) ◆──── (0..*) <b>RepairLog</b> [Composition: Nhật ký tiến độ sửa chữa gắn chặt với phiếu]</div>
    <div>• <b>RepairOrder</b> (1) ──── (0..*) <b>PartsRequest</b> [Association: Phiếu sửa chữa tạo các yêu cầu xuất linh kiện kho]</div>
    <div>• <b>PartsRequest</b> (1) ──── (1..*) <b>InventoryItem</b> [Association: Yêu cầu liên kết đến các mặt hàng trong kho]</div>
    <div>• <b>RepairOrder</b> (1) ──── (0..1) <b>Invoice</b> [Association 1-1: Mỗi phiếu sửa chữa có tối đa 1 hóa đơn thanh toán]</div>
    <div>• <b>RepairOrder</b> (1) ──── (0..*) <b>Payment</b> [Association 1-n: Hỗ trợ khách hàng thanh toán nhiều đợt/đặt cọc]</div>
    <div>• <b>RepairOrder</b> (1) ──── (0..1) <b>WarrantyClaim</b> [Association 1-1: Kích hoạt thẻ bảo hành điện tử sau khi thanh toán]</div>
  </div>
</div>
</body>
</html>`;
}

// Diagram 3: 10-Stage Activity Swimlane Diagram (Clean Standard Enterprise)
function get10StageSwimlaneHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #ffffff; padding: 30px; display: flex; justify-content: center; }
  .canvas { width: 1380px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; padding: 26px; }

  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 20px; }
  .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
  .meta { font-size: 12px; color: #475569; margin-top: 3px; }

  .swimlane-container { border: 1.5px solid #0f172a; display: flex; background: #ffffff; }
  .lane { flex: 1; border-right: 1px solid #cbd5e1; display: flex; flex-direction: column; }
  .lane:last-child { border-right: none; }

  .lane-header {
    background: #f1f5f9;
    border-bottom: 1.5px solid #0f172a;
    padding: 10px 4px;
    text-align: center;
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
  }

  .lane-body {
    padding: 16px 8px;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    min-height: 580px;
    background: #ffffff;
  }

  .node {
    width: 100%;
    border: 1.5px solid #0f172a;
    border-radius: 4px;
    padding: 8px 6px;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    background: #ffffff;
  }
  .stage-tag { font-size: 9.5px; font-weight: 800; color: #0284c7; display: block; margin-bottom: 2px; }

  .start-node { width: 24px; height: 24px; background: #0f172a; border-radius: 50%; }
  .end-node { width: 24px; height: 24px; border: 2.5px solid #0f172a; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
  .end-inner { width: 12px; height: 12px; background: #0f172a; border-radius: 50%; }

  .v-line { width: 1.5px; height: 12px; background: #64748b; }
</style>
</head>
<body>
<div class="canvas">
  <div class="header">
    <div class="title">Sơ Đồ Hoạt Động Swimlane Quy Trình 10 Giai Đoạn (Enterprise Activity Diagram)</div>
    <div class="meta">Quy trình điều phối liên phòng ban xuyên suốt vòng đời phiếu sửa chữa</div>
  </div>

  <div class="swimlane-container">
    <!-- Lane 1: Khách hàng -->
    <div class="lane">
      <div class="lane-header">Khách Hàng</div>
      <div class="lane-body">
        <div class="start-node"></div>
        <div class="v-line"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 1: PENDING</span>
          Đặt lịch sửa chữa & gửi hình ảnh thiết bị
        </div>
        <div style="height:110px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 6: APPROVED</span>
          Xem & duyệt báo giá trực tuyến trên App/Web
        </div>
        <div style="height:210px;"></div>
        <div class="node">
          <span class="stage-tag">BÀN GIAO & BẢO HÀNH</span>
          Nhận bàn giao máy & kích hoạt bảo hành
        </div>
        <div class="v-line"></div>
        <div class="end-node"><div class="end-inner"></div></div>
      </div>
    </div>

    <!-- Lane 2: Lễ Tân -->
    <div class="lane">
      <div class="lane-header">Lễ Tân</div>
      <div class="lane-body">
        <div style="height:44px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 2: ACCEPTED</span>
          Thẩm định yêu cầu & Bấm Tiếp nhận đơn
        </div>
        <div style="height:320px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 10: DELIVERED</span>
          Kiểm tra biên lai & Bàn giao thiết bị cho khách
        </div>
      </div>
    </div>

    <!-- Lane 3: Admin -->
    <div class="lane">
      <div class="lane-header">Quản Trị Viên (Admin)</div>
      <div class="lane-body">
        <div style="height:90px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 3: ASSIGNED</span>
          Phân công Kỹ thuật viên phụ trách theo tên
        </div>
        <div style="height:70px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 5: AWAITING_CUSTOMER</span>
          Thẩm định & Duyệt Báo giá Tầng 1
        </div>
      </div>
    </div>

    <!-- Lane 4: Kỹ thuật viên -->
    <div class="lane">
      <div class="lane-header">Kỹ Thuật Viên</div>
      <div class="lane-body">
        <div style="height:135px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 4: AWAITING_ADMIN</span>
          Khảo sát & lập dự toán báo giá chi phí
        </div>
        <div style="height:80px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 7: IN_PROGRESS</span>
          Bắt đầu sửa chữa & ghi nhật ký ảnh
        </div>
        <div class="v-line"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 8: WAITING_PARTS</span>
          Gửi yêu cầu cấp phát linh kiện kho
        </div>
        <div class="v-line"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 9: COMPLETED</span>
          Hoàn tất sửa chữa & nghiệm thu kỹ thuật
        </div>
      </div>
    </div>

    <!-- Lane 5: Thủ Kho -->
    <div class="lane">
      <div class="lane-header">Thủ Kho</div>
      <div class="lane-body">
        <div style="height:310px;"></div>
        <div class="node">
          <span class="stage-tag">XUẤT KHO NGUYÊN TỬ</span>
          Duyệt yêu cầu & trừ kho an toàn (FOR UPDATE)
        </div>
        <div style="font-size:10px;color:#64748b;text-align:center;">➔ Chuyển đơn về lại IN_PROGRESS</div>
      </div>
    </div>

    <!-- Lane 6: Kế toán -->
    <div class="lane">
      <div class="lane-header">Kế Toán</div>
      <div class="lane-body">
        <div style="height:410px;"></div>
        <div class="node">
          <span class="stage-tag">GIAI ĐOẠN 10: PAID</span>
          Lập hóa đơn & thu tiền đủ 100% (Chặn giao nếu nợ)
        </div>
      </div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// Diagram 4: Two-tier Quote Flow Activity Diagram (Clean Standard)
function getQuoteFlowActivityHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #ffffff; padding: 30px; display: flex; justify-content: center; }
  .canvas { width: 1100px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; padding: 26px; }

  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 22px; }
  .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
  .meta { font-size: 12px; color: #475569; margin-top: 2px; }

  .flow-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .act-box { width: 560px; background: #ffffff; border: 1.5px solid #0f172a; border-radius: 4px; padding: 10px 14px; }
  .act-role { font-size: 10px; font-weight: 800; color: #0284c7; text-transform: uppercase; }
  .act-name { font-size: 12.5px; font-weight: 700; color: #0f172a; margin-top: 1px; }
  .act-desc { font-size: 11px; color: #475569; margin-top: 2px; }

  .decision { width: 160px; height: 48px; border: 1.5px solid #0f172a; background: #f8fafc; display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 800; color: #0f172a; text-align: center; }
  .v-line { width: 1.5px; height: 12px; background: #64748b; }
  .branch-row { display: flex; gap: 30px; align-items: center; }
  .badge { font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 4px; border: 1px solid #0f172a; }
</style>
</head>
<body>
<div class="canvas">
  <div class="header">
    <div class="title">Sơ Đồ Hoạt Động (Activity Diagram) — Quy Trình Thẩm Định Báo Giá 2 Tầng</div>
    <div class="meta">Kiểm soát chi phí chặt chẽ: KTV lập ➔ Admin duyệt Tầng 1 ➔ Khách duyệt Tầng 2 ➔ Khóa giá</div>
  </div>

  <div class="flow-col">
    <div style="width:22px;height:22px;background:#0f172a;border-radius:50%;"></div>
    <div class="v-line"></div>

    <div class="act-box">
      <div class="act-role">Kỹ Thuật Viên</div>
      <div class="act-name">Lập dự toán chi phí & gửi báo giá</div>
      <div class="act-desc">Ghi nhận linh kiện thay thế + tiền công ➔ Chuyển ticket sang [AWAITING_ADMIN_APPROVAL]</div>
    </div>

    <div class="v-line"></div>

    <div class="act-box">
      <div class="act-role">Quản Trị Viên (Admin)</div>
      <div class="act-name">Thẩm định Báo giá Tầng 1</div>
      <div class="act-desc">Kiểm tra định mức phụ tùng công ty và thời gian sửa chữa cam kết</div>
    </div>

    <div class="v-line"></div>
    <div class="decision">Admin Duyệt?</div>

    <div class="branch-row">
      <div style="text-align:center;">
        <span class="badge" style="background:#fee2e2;color:#991b1b;">[Không duyệt]</span>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">Chuyển về [ASSIGNED] + Ghi chú lỗi giá để KTV lập lại</div>
      </div>
      <div style="text-align:center;">
        <span class="badge" style="background:#dcfce7;color:#166534;">[Phê duyệt]</span>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">Chuyển trạng thái sang [AWAITING_CUSTOMER_APPROVAL]</div>
      </div>
    </div>

    <div class="v-line"></div>

    <div class="act-box">
      <div class="act-role">Khách Hàng</div>
      <div class="act-name">Xem & Duyệt Báo giá Tầng 2 trên Web/App</div>
      <div class="act-desc">Khách hàng nhận thông báo tự động ➔ Xem chi tiết từng khoản chi phí ➔ Bấm Đồng ý / Từ chối</div>
    </div>

    <div class="v-line"></div>
    <div class="decision">Khách Đồng Ý?</div>

    <div class="branch-row">
      <div style="text-align:center;">
        <span class="badge" style="background:#fee2e2;color:#991b1b;">[Từ chối giá]</span>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">Chuyển sang [REJECTED] ➔ Bàn giao trả thiết bị</div>
      </div>
      <div style="text-align:center;">
        <span class="badge" style="background:#dcfce7;color:#166534;">[Đồng ý sửa]</span>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">Khóa trần chi phí cố định ➔ Chuyển sang [APPROVED]</div>
      </div>
    </div>

    <div class="v-line"></div>

    <div class="act-box" style="background:#f0fdf4;">
      <div class="act-role" style="color:#15803d;">Hệ Thống & Kỹ Thuật Viên</div>
      <div class="act-name">Kích hoạt quyền Bắt đầu Sửa chữa (IN_PROGRESS)</div>
      <div class="act-desc">KTV bấm nút vào sửa chữa thực tế; chi phí được snapshot bảo đảm không tự ý nâng giá khống</div>
    </div>

    <div class="v-line"></div>
    <div style="width:24px;height:24px;border:2.5px solid #0f172a;border-radius:50%;display:flex;align-items:center;justify-content:center;">
      <div style="width:12px;height:12px;background:#0f172a;border-radius:50%;"></div>
    </div>
  </div>
</div>
</body>
</html>`;
}

// Diagram 5: Atomic Parts Request Flow (Clean Standard)
function getPartsFlowActivityHtml() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #ffffff; padding: 30px; display: flex; justify-content: center; }
  .canvas { width: 1100px; background: #ffffff; border: 1px solid #94a3b8; border-radius: 4px; padding: 26px; }

  .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 22px; }
  .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
  .meta { font-size: 12px; color: #475569; margin-top: 2px; }

  .flow-col { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .box { width: 600px; border: 1.5px solid #0f172a; border-radius: 4px; padding: 10px 14px; background: #ffffff; }
  .role-label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #0284c7; }
  .name { font-size: 12.5px; font-weight: 700; color: #0f172a; margin-top: 1px; }
  .desc { font-size: 11px; color: #475569; margin-top: 2px; }
  .v-line { width: 1.5px; height: 12px; background: #64748b; }
  .decision { width: 180px; height: 46px; border: 1.5px solid #0f172a; background: #f8fafc; font-size: 11px; font-weight: 800; color: #0f172a; display: flex; align-items: center; justify-content: center; text-align: center; }
</style>
</head>
<body>
<div class="canvas">
  <div class="header">
    <div class="title">Sơ Đồ Hoạt Động (Activity Diagram) — Quy Trình Xuất Kho Linh Kiện Nguyên Tử</div>
    <div class="meta">Cơ chế quản lý kho chống tồn âm, khóa hàng loạt hàng chờ (FOR UPDATE) và hạch toán tự động</div>
  </div>

  <div class="flow-col">
    <div style="width:22px;height:22px;background:#0f172a;border-radius:50%;"></div>
    <div class="v-line"></div>

    <div class="box">
      <div class="role-label">Kỹ Thuật Viên</div>
      <div class="name">Lập Yêu Cầu Cấp Phát Linh Kiện (Parts Request)</div>
      <div class="desc">Chọn linh kiện từ danh mục kho, nhập số lượng cần thay ➔ Ticket chuyển sang [WAITING_PARTS]</div>
    </div>

    <div class="v-line"></div>

    <div class="box">
      <div class="role-label">Thủ Kho</div>
      <div class="name">Tiếp nhận yêu cầu & Mở Giao dịch Cơ sở dữ liệu (DB Transaction)</div>
      <div class="desc">Thực hiện câu lệnh SQL: SELECT stock_quantity FROM inventory_items FOR UPDATE</div>
    </div>

    <div class="v-line"></div>
    <div class="decision">Đủ Số Lượng Tồn Kho? (stock >= qty)</div>

    <div style="display:flex;gap:30px;">
      <div style="text-align:center;width:280px;">
        <span style="border:1px solid #0f172a;background:#fee2e2;color:#991b1b;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;">[KHÔNG ĐỦ HÀNG]</span>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">Rollback transaction. Thủ kho từ chối yêu cầu kèm lý do. Báo KTV mua ngoài hoặc nhập kho bổ sung.</div>
      </div>
      <div style="text-align:center;width:280px;">
        <span style="border:1px solid #0f172a;background:#dcfce7;color:#166534;font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;">[ĐỦ HÀNG XUẤT]</span>
        <div style="font-size:10.5px;color:#64748b;margin-top:3px;">Tiến hành trừ kho nguyên tử và tạo bản ghi Thẻ kho.</div>
      </div>
    </div>

    <div class="v-line"></div>

    <div class="box" style="background:#f0f9ff;">
      <div class="role-label">Hệ Thống Thực Thi Nguyên Tử (Atomic Commit)</div>
      <div class="name">Trừ tồn kho + Ghi Thẻ kho (ISSUE) + Thêm vào Phiếu sửa chữa</div>
      <div class="desc">1. Trừ stock kho | 2. Ghi log inventory_transactions | 3. Thêm repair_order_parts | 4. Cập nhật parts_total</div>
    </div>

    <div class="v-line"></div>

    <div class="box" style="background:#f0fdf4;">
      <div class="role-label" style="color:#15803d;">Tự Động Phục Hồi Tiến Độ</div>
      <div class="name">Tự động chuyển trạng thái phiếu về lại [IN_PROGRESS]</div>
      <div class="desc">KTV nhận linh kiện từ kho, tiếp tục công việc sửa chữa mà không cần thao tác trung gian</div>
    </div>

    <div class="v-line"></div>
    <div style="width:24px;height:24px;border:2.5px solid #0f172a;border-radius:50%;display:flex;align-items:center;justify-content:center;">
      <div style="width:12px;height:12px;background:#0f172a;border-radius:50%;"></div>
    </div>
  </div>
</div>
</body>
</html>`;
}

async function main() {
  console.log('--- GENERATING ENTERPRISE-STANDARD UML DIAGRAMS ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await renderHtmlToPng(browser, getGeneralUseCaseHtml(), path.join(OUTPUT_DIR, 'diagram_usecase_general.png'), 1440, 950);
    await renderHtmlToPng(browser, getQuoteApprovalUseCaseHtml(), path.join(OUTPUT_DIR, 'diagram_usecase_quote.png'), 1320, 880);
    await renderHtmlToPng(browser, get10StageSwimlaneHtml(), path.join(OUTPUT_DIR, 'diagram_activity_10stages.png'), 1440, 860);
    await renderHtmlToPng(browser, getQuoteFlowActivityHtml(), path.join(OUTPUT_DIR, 'diagram_activity_quote_flow.png'), 1180, 940);
    await renderHtmlToPng(browser, getPartsFlowActivityHtml(), path.join(OUTPUT_DIR, 'diagram_activity_parts_flow.png'), 1180, 920);
    await renderHtmlToPng(browser, getEnterpriseClassDiagramHtml(), path.join(OUTPUT_DIR, 'diagram_class_diagram.png'), 1540, 980);
    console.log('✅ ALL ENTERPRISE UML DIAGRAMS GENERATED SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('Error generating diagrams:', err);
  process.exit(1);
});
