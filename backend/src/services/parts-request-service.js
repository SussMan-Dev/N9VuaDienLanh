import { AppError } from '../lib/app-error.js';
import { positiveId, requireObject, string } from '../lib/validation.js';
import { parseListQuery, listResponse } from '../lib/pagination.js';

function generateRequestCode() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PR-${dateStr}-${rand}`;
}

function mapItem(row) {
  return {
    id: row.id,
    partsRequestId: row.parts_request_id,
    inventoryItemId: row.inventory_item_id,
    inventoryItemName: row.inventory_item_name ?? null,
    inventoryItemSku: row.inventory_item_sku ?? null,
    inventoryItemUnit: row.inventory_item_unit ?? null,
    quantityRequested: Number(row.quantity_requested),
    quantityApproved: row.quantity_approved !== null ? Number(row.quantity_approved) : null,
    quantityIssued: row.quantity_issued !== null ? Number(row.quantity_issued) : null,
    notes: row.notes ?? null,
  };
}

function mapRequest(row, items = []) {
  return {
    id: row.id,
    repairOrderId: row.repair_order_id,
    repairOrderCode: row.repair_order_code ?? null,
    requestCode: row.request_code,
    status: row.status,
    reason: row.reason ?? null,
    notes: row.notes ?? null,
    requestedByUserId: row.requested_by_user_id,
    requestedByName: row.requested_by_name ?? null,
    reviewedByUserId: row.reviewed_by_user_id ?? null,
    reviewedByName: row.reviewed_by_name ?? null,
    reviewedAt: row.reviewed_at ?? null,
    rejectionReason: row.rejection_reason ?? null,
    issuedAt: row.issued_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export async function listPartsRequests(db, query, authCtx) {
  const allowedSorts = ['createdAt', 'id'];
  const page = parseListQuery(query, allowedSorts, 'createdAt');
  const conditions = [];
  const params = [];

  if (query.status) {
    conditions.push('pr.status = ?');
    params.push(string(query.status, 'status', { min: 1, max: 30 }));
  }

  if (query.repairOrderId) {
    conditions.push('pr.repair_order_id = ?');
    params.push(positiveId(query.repairOrderId, 'repairOrderId'));
  }

  // If technician without manager rights, only see own requests
  const isManager = authCtx.roles.includes('ADMIN') ||
                    authCtx.roles.includes('MANAGER') ||
                    authCtx.roles.includes('WAREHOUSE_MANAGER');
  if (!isManager && authCtx.roles.includes('TECHNICIAN')) {
    conditions.push('pr.requested_by_user_id = ?');
    params.push(authCtx.user.id);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [countRows] = await db.query(
    `SELECT COUNT(*) AS total FROM parts_requests pr ${whereClause}`,
    params
  );
  const total = Number(countRows[0].total);

  const [rows] = await db.query(
    `SELECT pr.*, ro.code AS repair_order_code,
            u_req.full_name AS requested_by_name,
            u_rev.full_name AS reviewed_by_name
     FROM parts_requests pr
     LEFT JOIN repair_orders ro ON ro.id = pr.repair_order_id
     LEFT JOIN users u_req ON u_req.id = pr.requested_by_user_id
     LEFT JOIN users u_rev ON u_rev.id = pr.reviewed_by_user_id
     ${whereClause}
     ORDER BY pr.created_at DESC, pr.id DESC
     LIMIT ? OFFSET ?`,
    [...params, page.pageSize, page.offset]
  );

  const requestIds = rows.map((r) => r.id);
  let itemMap = new Map();

  if (requestIds.length > 0) {
    const [itemRows] = await db.query(
      `SELECT pri.*, ii.name AS inventory_item_name, ii.sku AS inventory_item_sku, ii.unit AS inventory_item_unit
       FROM parts_request_items pri
       LEFT JOIN inventory_items ii ON ii.id = pri.inventory_item_id
       WHERE pri.parts_request_id IN (?)
       ORDER BY pri.id ASC`,
      [requestIds]
    );

    for (const item of itemRows) {
      if (!itemMap.has(item.parts_request_id)) {
        itemMap.set(item.parts_request_id, []);
      }
      itemMap.get(item.parts_request_id).push(mapItem(item));
    }
  }

  const items = rows.map((r) => mapRequest(r, itemMap.get(r.id) || []));
  return listResponse(items, total, page.page, page.pageSize);
}

export async function getPartsRequest(db, id) {
  const numId = positiveId(id, 'partsRequestId');
  const [rows] = await db.query(
    `SELECT pr.*, ro.code AS repair_order_code,
            u_req.full_name AS requested_by_name,
            u_rev.full_name AS reviewed_by_name
     FROM parts_requests pr
     LEFT JOIN repair_orders ro ON ro.id = pr.repair_order_id
     LEFT JOIN users u_req ON u_req.id = pr.requested_by_user_id
     LEFT JOIN users u_rev ON u_rev.id = pr.reviewed_by_user_id
     WHERE pr.id = ?`,
    [numId]
  );

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Parts request not found');
  }

  const [itemRows] = await db.query(
    `SELECT pri.*, ii.name AS inventory_item_name, ii.sku AS inventory_item_sku, ii.unit AS inventory_item_unit
     FROM parts_request_items pri
     LEFT JOIN inventory_items ii ON ii.id = pri.inventory_item_id
     WHERE pri.parts_request_id = ?
     ORDER BY pri.id ASC`,
    [numId]
  );

  return mapRequest(rows[0], itemRows.map(mapItem));
}

export async function createPartsRequest(db, body, authCtx) {
  requireObject(body);
  const repairOrderId = positiveId(body.repairOrderId, 'repairOrderId');
  const reason = string(body.reason, 'reason', { max: 5000 });
  const notes = string(body.notes, 'notes', { max: 5000 });

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new AppError(422, 'VALIDATION_ERROR', 'items must be a non-empty array');
  }

  const [[order]] = await db.query(
    'SELECT id, repair_status, branch_id FROM repair_orders WHERE id = ?',
    [repairOrderId]
  );
  if (!order) {
    throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
  }

  const terminalStatuses = ['DELIVERED', 'CANCELLED', 'UNREPAIRABLE'];
  if (terminalStatuses.includes(order.repair_status)) {
    throw new AppError(409, 'INVALID_STATE', `Cannot request parts for order in status ${order.repair_status}`);
  }

  const validatedItems = [];
  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    const itemId = positiveId(item.inventoryItemId, `items[${i}].inventoryItemId`);
    const qty = Number(item.quantityRequested);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new AppError(422, 'VALIDATION_ERROR', `items[${i}].quantityRequested must be positive`);
    }
    const itemNotes = string(item.notes, `items[${i}].notes`, { max: 500 });
    validatedItems.push({ inventoryItemId: itemId, quantityRequested: qty, notes: itemNotes });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const requestCode = generateRequestCode();
    const [result] = await conn.query(
      `INSERT INTO parts_requests (
        repair_order_id, requested_by_user_id, request_code,
        status, reason, notes
      ) VALUES (?, ?, ?, 'PENDING', ?, ?)`,
      [repairOrderId, authCtx.user.id, requestCode, reason, notes]
    );

    const requestId = result.insertId;

    for (const item of validatedItems) {
      await conn.query(
        `INSERT INTO parts_request_items (
          parts_request_id, inventory_item_id, quantity_requested, notes
        ) VALUES (?, ?, ?, ?)`,
        [requestId, item.inventoryItemId, item.quantityRequested, item.notes]
      );
    }

    // Optionally set repair order status to WAITING_PARTS if currently REPAIRING or IN_PROGRESS
    if (order.repair_status === 'REPAIRING' || order.repair_status === 'IN_PROGRESS') {
      await conn.query(
        'UPDATE repair_orders SET repair_status = "WAITING_PARTS" WHERE id = ?',
        [repairOrderId]
      );
      await conn.query(
        `INSERT INTO repair_status_history (
          repair_order_id, from_status, to_status, changed_by_user_id, reason
        ) VALUES (?, ?, 'WAITING_PARTS', ?, 'Yêu cầu cấp phát linh kiện ${requestCode}')`,
        [repairOrderId, order.repair_status, authCtx.user.id]
      );
    }

    await conn.commit();
    return getPartsRequest(db, requestId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function approvePartsRequest(db, id, body, authCtx) {
  const numId = positiveId(id, 'partsRequestId');
  const existing = await getPartsRequest(db, numId);

  if (existing.status !== 'PENDING') {
    throw new AppError(409, 'INVALID_STATE', `Only PENDING requests can be approved, currently ${existing.status}`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Map approved quantities if specified
    const approvedMap = new Map();
    if (body && Array.isArray(body.items)) {
      for (const it of body.items) {
        if (it.partsRequestItemId && it.quantityApproved !== undefined) {
          const qty = Number(it.quantityApproved);
          if (qty < 0) throw new AppError(422, 'VALIDATION_ERROR', 'Approved quantity cannot be negative');
          approvedMap.set(positiveId(it.partsRequestItemId, 'partsRequestItemId'), qty);
        }
      }
    }

    for (const item of existing.items) {
      const approvedQty = approvedMap.has(item.id) ? approvedMap.get(item.id) : item.quantityRequested;
      await conn.query(
        'UPDATE parts_request_items SET quantity_approved = ? WHERE id = ?',
        [approvedQty, item.id]
      );
    }

    await conn.query(
      `UPDATE parts_requests
       SET status = 'APPROVED', reviewed_by_user_id = ?, reviewed_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [authCtx.user.id, numId]
    );

    await conn.commit();
    return getPartsRequest(db, numId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function rejectPartsRequest(db, id, body, authCtx) {
  const numId = positiveId(id, 'partsRequestId');
  requireObject(body);
  const rejectionReason = string(body.rejectionReason, 'rejectionReason', { required: true, min: 2, max: 1000 });

  const existing = await getPartsRequest(db, numId);
  if (existing.status !== 'PENDING') {
    throw new AppError(409, 'INVALID_STATE', `Only PENDING requests can be rejected, currently ${existing.status}`);
  }

  await db.query(
    `UPDATE parts_requests
     SET status = 'REJECTED', reviewed_by_user_id = ?, reviewed_at = UTC_TIMESTAMP(), rejection_reason = ?
     WHERE id = ?`,
    [authCtx.user.id, rejectionReason, numId]
  );

  // If order was in WAITING_PARTS, check if other pending requests exist; if none, return to IN_PROGRESS
  const [[order]] = await db.query(
    'SELECT id, repair_status FROM repair_orders WHERE id = ?',
    [existing.repairOrderId]
  );
  if (order && (order.repair_status === 'WAITING_PARTS')) {
    const [pendingOthers] = await db.query(
      'SELECT id FROM parts_requests WHERE repair_order_id = ? AND id != ? AND status IN ("PENDING", "APPROVED")',
      [order.id, numId]
    );
    if (!pendingOthers.length) {
      await db.query('UPDATE repair_orders SET repair_status = "IN_PROGRESS" WHERE id = ?', [order.id]);
      await db.query(
        `INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason)
         VALUES (?, 'WAITING_PARTS', 'IN_PROGRESS', ?, ?)`,
        [order.id, authCtx.user.id, `Thủ kho từ chối yêu cầu linh kiện: ${rejectionReason}`]
      );
    }
  }

  return getPartsRequest(db, numId);
}

export async function issuePartsRequest(db, id, authCtx) {
  const numId = positiveId(id, 'partsRequestId');
  const existing = await getPartsRequest(db, numId);

  if (existing.status !== 'APPROVED') {
    throw new AppError(409, 'INVALID_STATE', `Only APPROVED requests can be issued, currently ${existing.status}`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Determine warehouse for the repair order
    const [[order]] = await conn.query(
      'SELECT id, branch_id, repair_status FROM repair_orders WHERE id = ?',
      [existing.repairOrderId]
    );
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Repair order not found');

    const [[warehouse]] = await conn.query(
      'SELECT id FROM warehouses WHERE branch_id = ? AND is_active = 1 ORDER BY id LIMIT 1',
      [order.branch_id]
    );
    if (!warehouse) throw new AppError(404, 'NOT_FOUND', 'Active warehouse for this branch not found');

    // Verify and lock stock rows
    for (const item of existing.items) {
      const issueQty = item.quantityApproved !== null ? item.quantityApproved : item.quantityRequested;
      if (issueQty <= 0) continue;

      const [stockRows] = await conn.query(
        `SELECT s.id, s.quantity_on_hand, i.name, i.standard_cost, i.default_sale_price
         FROM inventory_stocks s
         JOIN inventory_items i ON i.id = s.inventory_item_id
         WHERE s.warehouse_id = ? AND s.inventory_item_id = ?
         FOR UPDATE`,
        [warehouse.id, item.inventoryItemId]
      );

      if (stockRows.length === 0 || Number(stockRows[0].quantity_on_hand) < issueQty) {
        const available = stockRows.length > 0 ? Number(stockRows[0].quantity_on_hand) : 0;
        throw new AppError(
          409,
          'INSUFFICIENT_STOCK',
          `Vật tư "${item.inventoryItemName}" không đủ tồn kho (cần: ${issueQty}, còn: ${available})`
        );
      }

      const stock = stockRows[0];
      const unitCost = Number(stock.standard_cost);
      const unitPrice = Number(stock.default_sale_price);
      const lineTotal = Number((issueQty * unitPrice).toFixed(2));

      // 1. Deduct stock
      await conn.query(
        'UPDATE inventory_stocks SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?',
        [issueQty, stock.id]
      );

      // 2. Insert inventory_transactions
      const [txResult] = await conn.query(
        `INSERT INTO inventory_transactions (
          warehouse_id, inventory_item_id, repair_order_id,
          transaction_type, quantity, unit_cost, performed_by_user_id, note
        ) VALUES (?, ?, ?, 'ISSUE', ?, ?, ?, ?)`,
        [
          warehouse.id,
          item.inventoryItemId,
          order.id,
          issueQty,
          unitCost,
          authCtx.user.id,
          `Xuất theo yêu cầu ${existing.requestCode}`,
        ]
      );

      // 3. Insert repair_order_parts
      await conn.query(
        `INSERT INTO repair_order_parts (
          repair_order_id, inventory_item_id, inventory_transaction_id,
          description, quantity, unit_cost_snapshot, unit_price_snapshot, line_total,
          created_by_user_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          item.inventoryItemId,
          txResult.insertId,
          stock.name,
          issueQty,
          unitCost,
          unitPrice,
          lineTotal,
          authCtx.user.id,
        ]
      );

      // 4. Update parts_request_items quantity_issued
      await conn.query(
        'UPDATE parts_request_items SET quantity_issued = ? WHERE id = ?',
        [issueQty, item.id]
      );
    }

    // Recalculate parts_total on repair order:
    // Only update directly if no approved quotes exist. If approved quote exists, customer liability is guarded by quote approvals.
    const [[approvedQuote]] = await conn.query(
      "SELECT id, parts_amount FROM quotes WHERE repair_order_id = ? AND status = 'APPROVED' ORDER BY id DESC LIMIT 1",
      [order.id]
    );
    if (!approvedQuote) {
      const [[partsSum]] = await conn.query(
        'SELECT COALESCE(SUM(line_total), 0) AS total FROM repair_order_parts WHERE repair_order_id = ?',
        [order.id]
      );
      await conn.query(
        'UPDATE repair_orders SET parts_total = ? WHERE id = ?',
        [partsSum.total, order.id]
      );
    }

    // Update parts_requests status
    await conn.query(
      `UPDATE parts_requests
       SET status = 'ISSUED', issued_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [numId]
    );

    // If order was in WAITING_PARTS, automatically transition back to IN_PROGRESS
    if (order.repair_status === 'WAITING_PARTS') {
      const nextStatus = 'IN_PROGRESS';
      await conn.query(
        'UPDATE repair_orders SET repair_status = ? WHERE id = ?',
        [nextStatus, order.id]
      );
      await conn.query(
        `INSERT INTO repair_status_history (
          repair_order_id, from_status, to_status, changed_by_user_id, reason
        ) VALUES (?, 'WAITING_PARTS', ?, ?, 'Linh kiện đã xuất kho đầy đủ')`,
        [order.id, nextStatus, authCtx.user.id]
      );
    }

    await conn.commit();
    return getPartsRequest(db, numId);
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function cancelPartsRequest(db, id, authCtx) {
  const numId = positiveId(id, 'partsRequestId');
  const existing = await getPartsRequest(db, numId);

  if (existing.status !== 'PENDING' && existing.status !== 'APPROVED') {
    throw new AppError(409, 'INVALID_STATE', `Cannot cancel request in status ${existing.status}`);
  }

  const isOwner = existing.requestedByUserId === authCtx.user.id;
  const isManager = authCtx.roles.includes('ADMIN') ||
                    authCtx.roles.includes('MANAGER') ||
                    authCtx.roles.includes('WAREHOUSE_MANAGER');

  if (!isOwner && !isManager) {
    throw new AppError(403, 'FORBIDDEN', 'Only the requester or a warehouse manager can cancel this request');
  }

  await db.query(
    'UPDATE parts_requests SET status = "CANCELLED" WHERE id = ?',
    [numId]
  );

  return getPartsRequest(db, numId);
}
