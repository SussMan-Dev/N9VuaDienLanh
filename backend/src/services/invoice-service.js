import { AppError } from '../lib/app-error.js';
import { positiveId, requireObject, string } from '../lib/validation.js';
import { parseListQuery, listResponse } from '../lib/pagination.js';

function generateInvoiceNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${dateStr}-${rand}`;
}

function mapInvoice(row) {
  return {
    id: row.id,
    repairOrderId: row.repair_order_id,
    repairOrderCode: row.repair_order_code ?? null,
    customerName: row.customer_name ?? null,
    customerPhone: row.customer_phone ?? null,
    invoiceNumber: row.invoice_number,
    issuedAt: row.issued_at,
    issuedByUserId: row.issued_by_user_id,
    issuedByName: row.issued_by_name ?? null,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    taxTotal: Number(row.tax_total),
    grandTotal: Number(row.grand_total),
    notes: row.notes ?? null,
    pdfPath: row.pdf_path ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createInvoice(db, orderId, body = {}, authCtx) {
  const numOrderId = positiveId(orderId, 'orderId');
  const [[order]] = await db.query(
    `SELECT ro.*, c.full_name AS customer_name, c.phone AS customer_phone, c.address_line AS customer_address,
            d.brand AS device_brand, d.model AS device_model
     FROM repair_orders ro
     LEFT JOIN customers c ON c.id = ro.customer_id
     LEFT JOIN devices d ON d.id = ro.device_id
     WHERE ro.id = ?`,
    [numOrderId]
  );

  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
  }

  // Check if an invoice already exists for this repair order
  const [existingInvoices] = await db.query(
    'SELECT id FROM invoices WHERE repair_order_id = ? ORDER BY id DESC LIMIT 1',
    [numOrderId]
  );
  if (existingInvoices.length > 0 && !body.allowRegenerate) {
    return getInvoice(db, existingInvoices[0].id);
  }

  const subtotal = Number(order.labor_total) + Number(order.parts_total);
  const discountTotal = Number(order.discount_total);
  const taxTotal = Number(order.tax_total);
  const grandTotal = Math.max(0, subtotal - discountTotal + taxTotal);

  const notes = body ? string(body.notes, 'notes', { max: 1000 }) : null;
  const invoiceNumber = generateInvoiceNumber();

  const [result] = await db.query(
    `INSERT INTO invoices (
      repair_order_id, invoice_number, issued_by_user_id,
      subtotal, discount_total, tax_total, grand_total, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      numOrderId,
      invoiceNumber,
      authCtx.user.id,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      notes,
    ]
  );

  return getInvoice(db, result.insertId);
}

export async function getInvoice(db, invoiceId) {
  const numId = positiveId(invoiceId, 'invoiceId');
  const [rows] = await db.query(
    `SELECT inv.*, ro.code AS repair_order_code,
            c.full_name AS customer_name, c.phone AS customer_phone, c.address_line AS customer_address,
            u.full_name AS issued_by_name
     FROM invoices inv
     LEFT JOIN repair_orders ro ON ro.id = inv.repair_order_id
     LEFT JOIN customers c ON c.id = ro.customer_id
     LEFT JOIN users u ON u.id = inv.issued_by_user_id
     WHERE inv.id = ?`,
    [numId]
  );

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
  }

  return mapInvoice(rows[0]);
}

export async function listInvoices(db, query) {
  const allowedSorts = ['issuedAt', 'createdAt', 'id'];
  const page = parseListQuery(query, allowedSorts, 'issuedAt');

  const conditions = [];
  const params = [];

  if (query.repairOrderId) {
    conditions.push('inv.repair_order_id = ?');
    params.push(positiveId(query.repairOrderId, 'repairOrderId'));
  }

  if (query.invoiceNumber) {
    conditions.push('inv.invoice_number LIKE ?');
    params.push(`%${query.invoiceNumber.trim()}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM invoices inv ${whereClause}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await db.query(
    `SELECT inv.*, ro.code AS repair_order_code,
            c.full_name AS customer_name, c.phone AS customer_phone,
            u.full_name AS issued_by_name
     FROM invoices inv
     LEFT JOIN repair_orders ro ON ro.id = inv.repair_order_id
     LEFT JOIN customers c ON c.id = ro.customer_id
     LEFT JOIN users u ON u.id = inv.issued_by_user_id
     ${whereClause}
     ORDER BY inv.issued_at DESC, inv.id DESC
     LIMIT ? OFFSET ?`,
    [...params, page.pageSize, page.offset]
  );

  return listResponse(rows.map(mapInvoice), total, page.page, page.pageSize);
}

export async function getInvoicePrintableHtml(db, invoiceId) {
  const numId = positiveId(invoiceId, 'invoiceId');
  const [rows] = await db.query(
    `SELECT inv.*, ro.code AS repair_order_code, ro.reported_issue,
            c.full_name AS customer_name, c.phone AS customer_phone, c.address_line AS customer_address,
            d.brand AS device_brand, d.model AS device_model, dt.name AS device_type_name,
            u.full_name AS issued_by_name
     FROM invoices inv
     LEFT JOIN repair_orders ro ON ro.id = inv.repair_order_id
     LEFT JOIN customers c ON c.id = ro.customer_id
     LEFT JOIN devices d ON d.id = ro.device_id
     LEFT JOIN device_types dt ON dt.id = d.device_type_id
     LEFT JOIN users u ON u.id = inv.issued_by_user_id
     WHERE inv.id = ?`,
    [numId]
  );

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
  }

  const inv = rows[0];

  // Fetch parts details
  const [parts] = await db.query(
    'SELECT description, quantity, unit_price_snapshot, line_total FROM repair_order_parts WHERE repair_order_id = ?',
    [inv.repair_order_id]
  );

  // Fetch payments
  const [payments] = await db.query(
    'SELECT receipt_number, payment_method, amount, paid_at FROM payments WHERE repair_order_id = ? AND status = "VALID"',
    [inv.repair_order_id]
  );

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Math.max(0, Number(inv.grand_total) - totalPaid);

  const formatVnd = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

  const partsRowsHtml = parts.map((p, idx) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${p.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${p.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatVnd(p.unit_price_snapshot)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatVnd(p.line_total)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hóa Đơn ${inv.invoice_number}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; line-height: 1.5; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; }
    .logo { font-size: 26px; font-weight: bold; color: #1a73e8; }
    .title { font-size: 24px; font-weight: bold; text-align: right; margin-bottom: 5px; }
    .meta { font-size: 14px; color: #666; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin: 30px 0; }
    .info-box { background: #f9f9f9; padding: 15px; border-radius: 6px; }
    .info-box h4 { margin: 0 0 10px 0; color: #1a73e8; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #f1f3f4; padding: 10px; border-bottom: 2px solid #ccc; text-align: left; }
    .total-box { margin-left: auto; width: 320px; margin-top: 20px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .total-row.grand { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; color: #1a73e8; }
    .footer { margin-top: 50px; text-align: center; font-size: 13px; color: #888; border-top: 1px solid #eee; padding-top: 20px; }
    @media print { body { margin: 15mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="padding: 10px 20px; background: #1a73e8; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 15px; font-weight: bold;">🖨 In Hóa Đơn / Lưu PDF</button>
  </div>

  <div class="header">
    <div>
      <div class="logo">⚡ ĐIỆN LẠNH PRO</div>
      <div class="meta">Dịch vụ sửa chữa & bảo dưỡng thiết bị điện lạnh</div>
      <div class="meta">Hotline: 1900 6868 | Email: support@dienlanhpro.vn</div>
    </div>
    <div>
      <div class="title">HÓA ĐƠN THANH TOÁN</div>
      <div class="meta">Số hóa đơn: <strong>${inv.invoice_number}</strong></div>
      <div class="meta">Mã phiếu: <strong>${inv.repair_order_code}</strong></div>
      <div class="meta">Ngày phát hành: ${formatDate(inv.issued_at)}</div>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <h4>KHÁCH HÀNG</h4>
      <div><strong>${inv.customer_name || 'Khách vãng lai'}</strong></div>
      <div>Điện thoại: ${inv.customer_phone || '—'}</div>
      <div>Địa chỉ: ${inv.customer_address || '—'}</div>
    </div>
    <div class="info-box">
      <h4>THIẾT BỊ SỬA CHỮA</h4>
      <div>Loại máy: <strong>${inv.device_type_name || 'Thiết bị điện lạnh'}</strong></div>
      <div>Hãng & Model: ${inv.device_brand || ''} ${inv.device_model || ''}</div>
      <div>Lỗi xử lý: ${inv.reported_issue || 'Bảo dưỡng / sửa chữa'}</div>
    </div>
  </div>

  ${parts.length > 0 ? `
  <h3>Chi tiết linh kiện & vật tư thay thế</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 40px; text-align: center;">STT</th>
        <th>Tên linh kiện / vật tư</th>
        <th style="width: 70px; text-align: center;">Số lượng</th>
        <th style="width: 120px; text-align: right;">Đơn giá</th>
        <th style="width: 130px; text-align: right;">Thành tiền</th>
      </tr>
    </thead>
    <tbody>
      ${partsRowsHtml}
    </tbody>
  </table>
  ` : ''}

  <div class="total-box">
    <div class="total-row"><span>Tiền công nhân công:</span><strong>${formatVnd(Number(inv.subtotal) - (parts.reduce((s, p) => s + Number(p.line_total), 0)))}</strong></div>
    <div class="total-row"><span>Tiền linh kiện thay thế:</span><strong>${formatVnd(parts.reduce((s, p) => s + Number(p.line_total), 0))}</strong></div>
    ${Number(inv.discount_total) > 0 ? `<div class="total-row" style="color: #d93025;"><span>Giảm giá khuyến mãi:</span><strong>-${formatVnd(inv.discount_total)}</strong></div>` : ''}
    <div class="total-row grand"><span>TỔNG CỘNG:</span><span>${formatVnd(inv.grand_total)}</span></div>
    <div class="total-row" style="color: #1e8e3e; margin-top: 5px;"><span>Đã thanh toán:</span><strong>${formatVnd(totalPaid)}</strong></div>
    ${balanceDue > 0 ? `<div class="total-row" style="color: #d93025;"><span>Còn thiếu:</span><strong>${formatVnd(balanceDue)}</strong></div>` : ''}
  </div>

  <div class="footer">
    <p>Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của Điện Lạnh PRO!</p>
    <p>Hóa đơn điện tử có giá trị làm chứng từ bảo hành theo phiếu sửa chữa.</p>
  </div>
</body>
</html>
  `;
}

