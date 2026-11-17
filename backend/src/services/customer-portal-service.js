import { AppError } from '../lib/app-error.js';
import { positiveId, requireObject, string, optionalDateTime } from '../lib/validation.js';
import { parseListQuery, listResponse } from '../lib/pagination.js';

function generateCode(prefix) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

async function getOrCreateCustomerId(db, authCtx) {
  if (authCtx.user.customerId) {
    return authCtx.user.customerId;
  }

  // Lookup customer linked to this user
  const [[user]] = await db.query('SELECT customer_id, full_name, phone, email FROM users WHERE id = ?', [authCtx.user.id]);
  if (user && user.customer_id) {
    return user.customer_id;
  }

  // If none exists, create a customer record
  const customerCode = 'KH-' + Date.now().toString(36).toUpperCase();
  const [result] = await db.query(
    'INSERT INTO customers (code, full_name, phone, email) VALUES (?, ?, ?, ?)',
    [customerCode, user.full_name, user.phone || '0900000000', user.email]
  );
  const newCustId = result.insertId;
  await db.query('UPDATE users SET customer_id = ? WHERE id = ?', [newCustId, authCtx.user.id]);
  return newCustId;
}

export async function createServiceRequest(db, body, authCtx) {
  requireObject(body);
  const customerId = await getOrCreateCustomerId(db, authCtx);

  const issueDescription = string(body.issueDescription, 'issueDescription', { required: true, min: 3, max: 5000 });
  const contactPhone = string(body.contactPhone, 'contactPhone', { max: 32 });
  const addressLine = string(body.addressLine, 'addressLine', { max: 255 });
  const preferredDatetime = optionalDateTime(body.preferredDatetime, 'preferredDatetime');

  let imagesJson = null;
  if (Array.isArray(body.images)) {
    imagesJson = JSON.stringify(body.images.map((s) => String(s)));
  }

  // Determine branch (use user branch or active branch)
  let branchId = authCtx.branchId;
  if (!branchId) {
    const [[branch]] = await db.query('SELECT id FROM branches WHERE is_active = 1 ORDER BY id LIMIT 1');
    if (!branch) throw new AppError(500, 'INTERNAL_ERROR', 'No active branch configured');
    branchId = branch.id;
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Device: either existing device belonging to customer or create new one
    let deviceId = null;
    if (body.deviceId) {
      deviceId = positiveId(body.deviceId, 'deviceId');
      const [[dev]] = await conn.query('SELECT id FROM devices WHERE id = ? AND customer_id = ?', [deviceId, customerId]);
      if (!dev) throw new AppError(404, 'NOT_FOUND', 'Device not found for this customer');
    } else {
      let deviceTypeId = null;
      if (body.deviceTypeId) {
        deviceTypeId = positiveId(body.deviceTypeId, 'deviceTypeId');
      } else {
        const [[dType]] = await conn.query('SELECT id FROM device_types WHERE is_active = 1 ORDER BY id LIMIT 1');
        if (dType) deviceTypeId = dType.id;
      }

      const brand = string(body.brand, 'brand', { max: 100 }) || 'Điện lạnh';
      const model = string(body.model, 'model', { max: 120 }) || 'Tiêu chuẩn';
      const serialNumber = string(body.serialNumber, 'serialNumber', { max: 120 });
      const description = string(body.deviceDescription, 'deviceDescription', { max: 500 });

      const [devResult] = await conn.query(
        `INSERT INTO devices (customer_id, device_type_id, brand, model, serial_number, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [customerId, deviceTypeId, brand, model, serialNumber, description]
      );
      deviceId = devResult.insertId;
    }

    // 2. Create service_requests
    const requestCode = generateCode('SR');
    const [reqResult] = await conn.query(
      `INSERT INTO service_requests (
        branch_id, customer_id, device_id, requested_by_user_id,
        request_code, issue_description, images, contact_phone,
        preferred_datetime, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN')`,
      [branchId, customerId, deviceId, authCtx.user.id, requestCode, issueDescription, imagesJson, contactPhone, preferredDatetime]
    );
    const serviceRequestId = reqResult.insertId;

    // 3. Create repair_orders in status PENDING
    const orderCode = generateCode('RO');
    const [orderResult] = await conn.query(
      `INSERT INTO repair_orders (
        branch_id, customer_id, device_id, service_request_id,
        received_by_user_id, code, repair_status, reported_issue,
        intake_condition, notes
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [
        branchId,
        customerId,
        deviceId,
        serviceRequestId,
        authCtx.user.id,
        orderCode,
        issueDescription,
        'Tiếp nhận trực tuyến từ khách hàng',
        addressLine ? `Địa chỉ sửa chữa: ${addressLine}` : null,
      ]
    );
    const orderId = orderResult.insertId;

    // 4. Initial status history
    await conn.query(
      `INSERT INTO repair_status_history (
        repair_order_id, from_status, to_status, changed_by_user_id, reason
      ) VALUES (?, NULL, 'PENDING', ?, 'Khách hàng tạo yêu cầu trực tuyến')`,
      [orderId, authCtx.user.id]
    );

    await conn.commit();

    return {
      orderId,
      orderCode,
      serviceRequestId,
      requestCode,
      status: 'PENDING',
      message: 'Tạo đơn sửa chữa thành công, đang chờ lễ tân tiếp nhận',
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function listCustomerOrders(db, query, authCtx) {
  const customerId = await getOrCreateCustomerId(db, authCtx);
  const allowedSorts = ['createdAt', 'receivedAt', 'id'];
  const page = parseListQuery(query, allowedSorts, 'createdAt');

  const conditions = ['ro.customer_id = ?'];
  const params = [customerId];

  if (query.status) {
    const st = string(query.status, 'status', { min: 1, max: 30 });
    if (st === 'PENDING' || st === 'PENDING_RECEPTION') {
      conditions.push("ro.repair_status IN ('PENDING', 'PENDING_RECEPTION')");
    } else if (st === 'ACCEPTED' || st === 'RECEIVED') {
      conditions.push("ro.repair_status IN ('ACCEPTED', 'RECEIVED')");
    } else {
      conditions.push('ro.repair_status = ?');
      params.push(st);
    }
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM repair_orders ro ${whereClause}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await db.query(
    `SELECT ro.id, ro.code, ro.repair_status, ro.reported_issue, ro.intake_condition, ro.notes,
            ro.labor_total, ro.parts_total, ro.discount_total, ro.tax_total,
            ro.received_at, ro.completed_at, ro.delivered_at, ro.created_at,
            ro.rejection_reason,
            d.brand AS device_brand, d.model AS device_model, dt.name AS device_type_name,
            tu.full_name AS technician_name, tu.phone AS technician_phone,
            sr.preferred_datetime, sr.contact_phone AS request_contact_phone,
            pq.id AS pending_quote_id, pq.total_amount AS pending_quote_total
     FROM repair_orders ro
     LEFT JOIN devices d ON d.id = ro.device_id
     LEFT JOIN device_types dt ON dt.id = d.device_type_id
     LEFT JOIN repair_assignments ra ON ra.repair_order_id = ro.id AND ra.unassigned_at IS NULL
     LEFT JOIN users tu ON tu.id = ra.technician_user_id
     LEFT JOIN service_requests sr ON sr.id = ro.service_request_id
     LEFT JOIN (
       SELECT q.repair_order_id, q.id,
              (q.labor_amount + q.parts_amount - q.discount_amount + q.tax_amount) AS total_amount
       FROM quotes q
       WHERE q.status = 'PENDING_CUSTOMER' AND q.admin_approval_status = 'APPROVED'
     ) pq ON pq.repair_order_id = ro.id
     ${whereClause}
     ORDER BY ro.created_at DESC, ro.id DESC
     LIMIT ? OFFSET ?`,
    [...params, page.pageSize, page.offset]
  );

  const items = rows.map((r) => {
    const totalAmount = Number(r.labor_total) + Number(r.parts_total) - Number(r.discount_total) + Number(r.tax_total);
    const address = r.notes?.startsWith('Địa chỉ') ? r.notes.replace('Địa chỉ sửa chữa: ', '') : null;
    return {
      id: r.id,
      code: r.code,
      orderCode: r.code,
      repairStatus: r.repair_status,
      reportedIssue: r.reported_issue,
      intakeCondition: r.intake_condition,
      rejectionReason: r.rejection_reason ?? null,
      address,
      notes: r.notes,
      preferredDatetime: r.preferred_datetime ?? null,
      contactPhone: r.request_contact_phone ?? null,
      device: {
        brand: r.device_brand,
        model: r.device_model,
        typeName: r.device_type_name,
      },
      technician: r.technician_name ? {
        name: r.technician_name,
        phone: r.technician_phone ?? null,
      } : null,
      pendingQuote: r.pending_quote_id ? {
        id: r.pending_quote_id,
        totalAmount: Number(r.pending_quote_total),
      } : null,
      totalAmount,
      receivedAt: r.received_at,
      completedAt: r.completed_at,
      deliveredAt: r.delivered_at,
      createdAt: r.created_at,
    };
  });

  return listResponse(items, total, page.page, page.pageSize);
}

export async function getCustomerOrderDetail(db, orderId, authCtx) {
  const customerId = await getOrCreateCustomerId(db, authCtx);
  const numOrderId = positiveId(orderId, 'orderId');

  const [rows] = await db.query(
    `SELECT ro.*,
            d.brand AS device_brand, d.model AS device_model, d.serial_number AS device_serial,
            dt.name AS device_type_name,
            sr.images AS request_images, sr.contact_phone AS request_contact_phone, sr.preferred_datetime
     FROM repair_orders ro
     LEFT JOIN devices d ON d.id = ro.device_id
     LEFT JOIN device_types dt ON dt.id = d.device_type_id
     LEFT JOIN service_requests sr ON sr.id = ro.service_request_id
     WHERE ro.id = ? AND ro.customer_id = ?`,
    [numOrderId, customerId]
  );

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Repair order not found for this customer');
  }

  const r = rows[0];

  // Fetch status history
  const [historyRows] = await db.query(
    `SELECT from_status, to_status, reason, changed_at
     FROM repair_status_history
     WHERE repair_order_id = ?
     ORDER BY changed_at ASC`,
    [numOrderId]
  );

  // Fetch payments
  const [paymentRows] = await db.query(
    `SELECT receipt_number, payment_method, status, amount, paid_at
     FROM payments
     WHERE repair_order_id = ? AND status = 'VALID'
     ORDER BY paid_at DESC`,
    [numOrderId]
  );

  const totalCollected = paymentRows.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalAmount = Number(r.labor_total) + Number(r.parts_total) - Number(r.discount_total) + Number(r.tax_total);
  const balanceDue = Math.max(0, totalAmount - totalCollected);

  // Fetch warranties
  const [warrantyRows] = await db.query(
    `SELECT warranty_code, starts_at, ends_at, status, terms
     FROM warranties
     WHERE repair_order_id = ?`,
    [numOrderId]
  );

  // Fetch quotes
  const [quoteRows] = await db.query(
    `SELECT q.id, q.version_no, q.status, q.admin_approval_status, q.admin_reject_note, q.is_supplemental,
            q.labor_amount, q.parts_amount,
            q.discount_amount, q.tax_amount,
            (q.labor_amount + q.parts_amount - q.discount_amount + q.tax_amount) AS total_amount,
            q.valid_until, q.created_at, u.full_name AS created_by_name
     FROM quotes q
     JOIN users u ON u.id = q.created_by_user_id
     WHERE q.repair_order_id = ?
     ORDER BY q.version_no DESC`,
    [numOrderId]
  );

  const quoteIds = quoteRows.map((q) => q.id);
  const quoteItemsMap = {};
  if (quoteIds.length > 0) {
    const [items] = await db.query(
      `SELECT id, quote_id, item_type, description, quantity, unit_price, line_total
       FROM quote_items
       WHERE quote_id IN (?)
       ORDER BY id ASC`,
      [quoteIds]
    );
    for (const it of items) {
      if (!quoteItemsMap[it.quote_id]) quoteItemsMap[it.quote_id] = [];
      quoteItemsMap[it.quote_id].push({
        id: it.id,
        itemType: it.item_type,
        description: it.description,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unit_price),
        lineTotal: Number(it.line_total),
      });
    }
  }

  const quotes = quoteRows.map((q) => ({
    id: q.id,
    versionNo: q.version_no,
    status: q.status,
    adminApprovalStatus: q.admin_approval_status || 'PENDING',
    adminRejectNote: q.admin_reject_note || null,
    isSupplemental: Boolean(q.is_supplemental),
    laborAmount: Number(q.labor_amount),
    partsAmount: Number(q.parts_amount),
    discountAmount: Number(q.discount_amount),
    taxAmount: Number(q.tax_amount),
    totalAmount: Number(q.total_amount),
    validUntil: q.valid_until,
    createdByName: q.created_by_name,
    createdAt: q.created_at,
    items: quoteItemsMap[q.id] || [],
  }));

  let requestImages = [];
  if (r.request_images) {
    try {
      requestImages = typeof r.request_images === 'string' ? JSON.parse(r.request_images) : r.request_images;
    } catch {
      requestImages = [];
    }
  }

  return {
    id: r.id,
    code: r.code,
    repairStatus: r.repair_status,
    rejectionReason: r.rejection_reason || null,
    reportedIssue: r.reported_issue,
    intakeCondition: r.intake_condition,
    notes: r.notes,
    device: {
      brand: r.device_brand,
      model: r.device_model,
      serialNumber: r.device_serial,
      typeName: r.device_type_name,
    },
    serviceRequest: {
      images: requestImages,
      contactPhone: r.request_contact_phone,
      preferredDatetime: r.preferred_datetime,
    },
    financials: {
      laborTotal: Number(r.labor_total),
      partsTotal: Number(r.parts_total),
      discountTotal: Number(r.discount_total),
      taxTotal: Number(r.tax_total),
      totalAmount,
      totalCollected,
      balanceDue,
    },
    payments: paymentRows.map((p) => ({
      receiptNumber: p.receipt_number,
      paymentMethod: p.payment_method,
      amount: Number(p.amount),
      paidAt: p.paid_at,
    })),
    warranties: warrantyRows.map((w) => ({
      warrantyCode: w.warranty_code,
      startsAt: w.starts_at,
      endsAt: w.ends_at,
      status: w.status,
      terms: w.terms,
    })),
    quotes,
    timeline: historyRows.map((h) => ({
      fromStatus: h.from_status,
      toStatus: h.to_status,
      reason: h.reason,
      changedAt: h.changed_at,
    })),
    receivedAt: r.received_at,
    promisedAt: r.promised_at,
    completedAt: r.completed_at,
    deliveredAt: r.delivered_at,
    createdAt: r.created_at,
  };
}

export async function listCustomerDevices(db, authCtx) {
  const customerId = await getOrCreateCustomerId(db, authCtx);
  const [rows] = await db.query(
    `SELECT d.*, dt.name AS device_type_name, dt.code AS device_type_code,
            (SELECT COUNT(*) FROM repair_orders ro WHERE ro.device_id = d.id) AS total_repairs,
            (SELECT ro.repair_status FROM repair_orders ro WHERE ro.device_id = d.id ORDER BY ro.id DESC LIMIT 1) AS latest_repair_status,
            (SELECT ro.code FROM repair_orders ro WHERE ro.device_id = d.id ORDER BY ro.id DESC LIMIT 1) AS latest_repair_code,
            (SELECT ro.created_at FROM repair_orders ro WHERE ro.device_id = d.id ORDER BY ro.id DESC LIMIT 1) AS latest_repaired_at
     FROM devices d
     LEFT JOIN device_types dt ON dt.id = d.device_type_id
     WHERE d.customer_id = ? AND d.is_active = 1
     ORDER BY d.id DESC`,
    [customerId]
  );

  return rows.map((d) => ({
    id: d.id,
    brand: d.brand,
    model: d.model,
    serialNumber: d.serial_number,
    description: d.description,
    typeId: d.device_type_id,
    typeCode: d.device_type_code,
    typeName: d.device_type_name || 'Điện lạnh',
    totalRepairs: Number(d.total_repairs || 0),
    latestRepairStatus: d.latest_repair_status || null,
    latestRepairCode: d.latest_repair_code || null,
    latestRepairedAt: d.latest_repaired_at || null,
    createdAt: d.created_at,
  }));
}

export async function createCustomerDevice(db, body, authCtx) {
  requireObject(body);
  const customerId = await getOrCreateCustomerId(db, authCtx);

  const brand = string(body.brand, 'brand', { required: true, min: 1, max: 100 });
  const model = string(body.model, 'model', { required: true, min: 1, max: 120 });
  const serialNumber = string(body.serialNumber, 'serialNumber', { max: 120 });
  const description = string(body.description, 'description', { max: 500 });

  let deviceTypeId = null;
  if (body.deviceTypeId) {
    deviceTypeId = positiveId(body.deviceTypeId, 'deviceTypeId');
  } else {
    const [[dType]] = await db.query('SELECT id FROM device_types WHERE is_active = 1 ORDER BY id LIMIT 1');
    if (dType) deviceTypeId = dType.id;
  }

  const [result] = await db.query(
    `INSERT INTO devices (customer_id, device_type_id, brand, model, serial_number, description, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
    [customerId, deviceTypeId, brand, model, serialNumber, description]
  );

  const newId = result.insertId;
  const [[dev]] = await db.query(
    `SELECT d.*, dt.name AS device_type_name, dt.code AS device_type_code
     FROM devices d
     LEFT JOIN device_types dt ON dt.id = d.device_type_id
     WHERE d.id = ?`,
    [newId]
  );

  return {
    id: dev.id,
    brand: dev.brand,
    model: dev.model,
    serialNumber: dev.serial_number,
    description: dev.description,
    typeId: dev.device_type_id,
    typeCode: dev.device_type_code,
    typeName: dev.device_type_name || 'Điện lạnh',
    totalRepairs: 0,
    latestRepairStatus: null,
    latestRepairCode: null,
    latestRepairedAt: null,
    createdAt: dev.created_at,
  };
}

export async function listDeviceTypes(db) {
  const [rows] = await db.query(
    `SELECT id, code, name, is_active AS isActive
     FROM device_types
     WHERE is_active = 1
     ORDER BY id ASC`
  );
  return rows;
}

export async function listCustomerWarranties(db, authCtx) {
  const customerId = await getOrCreateCustomerId(db, authCtx);
  const [rows] = await db.query(
    `SELECT w.id,
            w.warranty_code AS warrantyCode,
            dt.name AS deviceType,
            d.brand,
            w.starts_at AS startsAt,
            w.ends_at AS endsAt,
            w.terms AS warrantyTerms,
            w.status
     FROM warranties w
     JOIN repair_orders ro ON ro.id = w.repair_order_id
     JOIN devices d ON d.id = ro.device_id
     JOIN device_types dt ON dt.id = d.device_type_id
     WHERE ro.customer_id = ?
     ORDER BY w.ends_at DESC`,
    [customerId]
  );
  return { items: rows };
}

