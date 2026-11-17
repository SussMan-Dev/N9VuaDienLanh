import { AppError } from '../lib/app-error.js';
import { positiveId, requireObject, string, optionalDate } from '../lib/validation.js';
import { parseListQuery, listResponse } from '../lib/pagination.js';

function mapLog(row) {
  let imagesBefore = [];
  let imagesAfter = [];
  if (row.images_before) {
    try {
      imagesBefore = typeof row.images_before === 'string' ? JSON.parse(row.images_before) : row.images_before;
    } catch {
      imagesBefore = [];
    }
  }
  if (row.images_after) {
    try {
      imagesAfter = typeof row.images_after === 'string' ? JSON.parse(row.images_after) : row.images_after;
    } catch {
      imagesAfter = [];
    }
  }

  return {
    id: row.id,
    repairOrderId: row.repair_order_id,
    technicianUserId: row.technician_user_id,
    technicianName: row.technician_name ?? null,
    performedAt: row.performed_at,
    deviceCondition: row.device_condition ?? null,
    rootCause: row.root_cause ?? null,
    workPerformed: row.work_performed,
    testResult: row.test_result ?? null,
    imagesBefore,
    imagesAfter,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function verifyOrderExists(db, orderId) {
  const numId = positiveId(orderId, 'orderId');
  const [[order]] = await db.query('SELECT id, branch_id, repair_status FROM repair_orders WHERE id = ?', [numId]);
  if (!order) throw new AppError(404, 'NOT_FOUND', 'Repair order not found');
  return order;
}

export async function listRepairLogs(db, orderId, query) {
  await verifyOrderExists(db, orderId);
  const numOrderId = positiveId(orderId, 'orderId');
  const allowedSorts = ['performedAt', 'createdAt', 'id'];
  const page = parseListQuery(query, allowedSorts, 'performedAt');

  const [countRows] = await db.query(
    'SELECT COUNT(*) AS total FROM repair_logs WHERE repair_order_id = ?',
    [numOrderId]
  );
  const total = Number(countRows[0].total);

  const [rows] = await db.query(
    `SELECT rl.*, u.full_name AS technician_name
     FROM repair_logs rl
     LEFT JOIN users u ON u.id = rl.technician_user_id
     WHERE rl.repair_order_id = ?
     ORDER BY rl.performed_at DESC, rl.id DESC
     LIMIT ? OFFSET ?`,
    [numOrderId, page.pageSize, page.offset]
  );

  return listResponse(rows.map(mapLog), total, page.page, page.pageSize);
}

export async function getRepairLog(db, orderId, logId) {
  await verifyOrderExists(db, orderId);
  const numOrderId = positiveId(orderId, 'orderId');
  const numLogId = positiveId(logId, 'logId');

  const [rows] = await db.query(
    `SELECT rl.*, u.full_name AS technician_name
     FROM repair_logs rl
     LEFT JOIN users u ON u.id = rl.technician_user_id
     WHERE rl.id = ? AND rl.repair_order_id = ?`,
    [numLogId, numOrderId]
  );

  if (rows.length === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Repair log not found');
  }

  return mapLog(rows[0]);
}

export async function createRepairLog(db, orderId, body, authCtx) {
  await verifyOrderExists(db, orderId);
  const numOrderId = positiveId(orderId, 'orderId');
  requireObject(body);

  const workPerformed = string(body.workPerformed, 'workPerformed', { required: true, min: 1, max: 5000 });
  const deviceCondition = string(body.deviceCondition, 'deviceCondition', { max: 5000 });
  const rootCause = string(body.rootCause, 'rootCause', { max: 5000 });
  const testResult = string(body.testResult, 'testResult', { max: 5000 });
  const notes = string(body.notes, 'notes', { max: 5000 });
  const performedAt = optionalDate(body.performedAt, 'performedAt') || new Date();

  let imagesBeforeJson = null;
  if (Array.isArray(body.imagesBefore)) {
    imagesBeforeJson = JSON.stringify(body.imagesBefore.map((s) => String(s)));
  }

  let imagesAfterJson = null;
  if (Array.isArray(body.imagesAfter)) {
    imagesAfterJson = JSON.stringify(body.imagesAfter.map((s) => String(s)));
  }

  const [result] = await db.query(
    `INSERT INTO repair_logs (
      repair_order_id, technician_user_id, performed_at,
      device_condition, root_cause, work_performed, test_result,
      images_before, images_after, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      numOrderId,
      authCtx.user.id,
      performedAt,
      deviceCondition,
      rootCause,
      workPerformed,
      testResult,
      imagesBeforeJson,
      imagesAfterJson,
      notes,
    ]
  );

  return getRepairLog(db, numOrderId, result.insertId);
}

export async function updateRepairLog(db, orderId, logId, body, authCtx) {
  const existing = await getRepairLog(db, orderId, logId);
  const isOwner = existing.technicianUserId === authCtx.user.id;
  const isManagerOrAdmin = authCtx.roles.includes('ADMIN') || authCtx.roles.includes('MANAGER');

  if (!isOwner && !isManagerOrAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Only the log author or managers can update this repair log');
  }

  requireObject(body);
  const updates = [];
  const params = [];

  if (body.workPerformed !== undefined) {
    updates.push('work_performed = ?');
    params.push(string(body.workPerformed, 'workPerformed', { required: true, min: 1, max: 5000 }));
  }

  if (body.deviceCondition !== undefined) {
    updates.push('device_condition = ?');
    params.push(string(body.deviceCondition, 'deviceCondition', { max: 5000 }));
  }

  if (body.rootCause !== undefined) {
    updates.push('root_cause = ?');
    params.push(string(body.rootCause, 'rootCause', { max: 5000 }));
  }

  if (body.testResult !== undefined) {
    updates.push('test_result = ?');
    params.push(string(body.testResult, 'testResult', { max: 5000 }));
  }

  if (body.notes !== undefined) {
    updates.push('notes = ?');
    params.push(string(body.notes, 'notes', { max: 5000 }));
  }

  if (body.performedAt !== undefined) {
    updates.push('performed_at = ?');
    params.push(optionalDate(body.performedAt, 'performedAt'));
  }

  if (body.imagesBefore !== undefined) {
    updates.push('images_before = ?');
    params.push(Array.isArray(body.imagesBefore) ? JSON.stringify(body.imagesBefore.map((s) => String(s))) : null);
  }

  if (body.imagesAfter !== undefined) {
    updates.push('images_after = ?');
    params.push(Array.isArray(body.imagesAfter) ? JSON.stringify(body.imagesAfter.map((s) => String(s))) : null);
  }

  if (updates.length === 0) {
    return existing;
  }

  params.push(existing.id);
  await db.query(`UPDATE repair_logs SET ${updates.join(', ')} WHERE id = ?`, params);

  return getRepairLog(db, orderId, logId);
}

export async function deleteRepairLog(db, orderId, logId, authCtx) {
  const existing = await getRepairLog(db, orderId, logId);
  const isOwner = existing.technicianUserId === authCtx.user.id;
  const isAdmin = authCtx.roles.includes('ADMIN');

  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'FORBIDDEN', 'Only the log author or an admin can delete this repair log');
  }

  await db.query('DELETE FROM repair_logs WHERE id = ?', [existing.id]);
}
