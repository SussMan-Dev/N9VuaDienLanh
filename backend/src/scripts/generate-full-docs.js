/**
 * Documentation Generator (Sinh tài liệu tổng hợp dự án)
 * Gom toàn bộ tài liệu đặc tả, kiến trúc, API, Database, Quy tắc nghiệp vụ,
 * Mobile App và Hướng dẫn vận hành thành 1 file duy nhất (Markdown & HTML in PDF).
 *
 * Chạy lệnh:
 *   cd backend && node src/scripts/generate-full-docs.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');
const docsDir = path.join(rootDir, 'docs');
const outputDir = path.join(docsDir, 'dist');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('📚 [DocGen] Đang quét và tổng hợp tài liệu từ:', docsDir);

const filesToInclude = [
  { title: '1. TỔNG QUAN HỆ THỐNG & SẢN PHẨM', file: 'PRODUCT.md' },
  { title: '2. KIẾN TRÚC HỆ THỐNG TỔNG THỂ', file: 'ARCHITECTURE.md' },
  { title: '3. QUY TRÌNH 10 GIAI ĐOẠN & QUY TẮC NGHIỆP VỤ (6 ROLES)', file: 'BUSINESS_RULES.md' },
  { title: '4. ĐẶC TẢ CHI TIẾT CƠ SỞ DỮ LIỆU & SCHEMA', file: 'DATABASE.md' },
  { title: '5. ĐẶC TẢ GIAO DIỆN LẬP TRÌNH RESTFUL API', file: 'API_SPEC.md' },
  { title: '6. KIẾN TRÚC & GIAO DIỆN ỨNG DỤNG DI ĐỘNG (MOBILE APP)', file: 'MOBILE_ARCHITECTURE.md' },
  { title: '7. CẨM NANG VẬN HÀNH, TRIỂN KHAI & XỬ LÝ SỰ CỐ', file: 'OPERATIONS.md' },
  { title: '8. TIÊU CHUẨN AN TOÀN & BẢO MẬT HỆ THỐNG', file: 'SECURITY.md' },
  { title: '9. MA TRẬN BACKLOG & TIẾN ĐỘ THỰC HIỆN CÁC GIAI ĐOẠN', file: 'tasks/README.md' },
];

let fullMarkdown = `# HỆ THỐNG QUẢN LÝ SỬA CHỮA ĐIỆN MÁY — ĐIỆN LẠNH
## TÀI LIỆU KỸ THUẬT & HƯỚNG DẪN VẬN HÀNH TỔNG HỢP (ENTERPRISE EDITION)
*Ngày tạo: ${new Date().toLocaleString('vi-VN')}*
*Phiên bản: 2.5 (Hỗ trợ 6 Vai trò, Quy trình 10 Giai đoạn & Ứng dụng Di động React Native Expo)*

---

## MỤC LỤC TỔNG QUAN
${filesToInclude.map((item, index) => `${index + 1}. [${item.title}](#section-${index + 1})`).join('\n')}

---
\n`;

for (let i = 0; i < filesToInclude.length; i++) {
  const item = filesToInclude[i];
  const filePath = path.join(docsDir, item.file);

  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    fullMarkdown += `<a id="section-${i + 1}"></a>\n\n`;
    fullMarkdown += `# ${item.title}\n\n`;
    fullMarkdown += `*Nguồn: docs/${item.file}*\n\n`;
    fullMarkdown += content + '\n\n';
    fullMarkdown += '---\n\n';
    console.log(`  ✓ Đã nạp: docs/${item.file}`);
  } else {
    console.warn(`  ⚠ Bỏ qua (không tìm thấy): docs/${item.file}`);
  }
}

// 1. Xuất file Markdown tổng hợp
const mdOutputPath = path.join(outputDir, 'FULL_PROJECT_DOCUMENTATION.md');
fs.writeFileSync(mdOutputPath, fullMarkdown, 'utf8');
console.log('✅ 1. Xuất file Markdown thành công:', mdOutputPath);

// 2. Xuất file HTML chuẩn xem / in PDF
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const htmlTemplate = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tài Liệu Tổng Hợp Hệ Thống Quản Lý Sửa Chữa Điện Máy</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 960px;
      margin: 40px auto;
      background: #ffffff;
      padding: 48px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }
    h1 { color: #1d4ed8; font-size: 28px; border-bottom: 3px solid #1d4ed8; padding-bottom: 8px; margin-top: 40px; }
    h2 { color: #0f172a; font-size: 22px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 32px; }
    h3 { color: #334155; font-size: 18px; margin-top: 24px; }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
    }
    code {
      font-family: Consolas, Monaco, "Courier New", monospace;
      background: #f1f5f9;
      color: #0f172a;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 13px;
    }
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
    }
    tr:nth-child(even) { background-color: #f8fafc; }
    blockquote {
      border-left: 4px solid #1d4ed8;
      background: #eff6ff;
      margin: 16px 0;
      padding: 12px 16px;
      color: #1e3a8a;
    }
    .print-bar {
      position: sticky;
      top: 0;
      background: #1d4ed8;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .print-btn {
      background: #ffffff;
      color: #1d4ed8;
      border: none;
      padding: 8px 20px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    .print-btn:hover { background: #f1f5f9; }
    @media print {
      .print-bar { display: none; }
      .container { box-shadow: none; padding: 0; margin: 0; max-width: 100%; }
      body { background: #fff; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div><strong>👑 Vua Sửa Chữa</strong> — Cẩm Nang Tài Liệu Tổng Hợp Toàn Bộ Dự Án</div>
    <button class="print-btn" onclick="window.print()">🖨️ In ra / Xuất PDF</button>
  </div>
  <div class="container">
    <pre style="background: transparent; color: inherit; white-space: pre-wrap; font-family: inherit; font-size: inherit; padding: 0;">${escapeHtml(fullMarkdown)}</pre>
  </div>
</body>
</html>`;

const htmlOutputPath = path.join(outputDir, 'FULL_PROJECT_DOCUMENTATION.html');
fs.writeFileSync(htmlOutputPath, htmlTemplate, 'utf8');
console.log('✅ 2. Xuất file HTML xem & In PDF thành công:', htmlOutputPath);
console.log('\n🎉 Quá trình sinh tài liệu hoàn tất 100%!');
