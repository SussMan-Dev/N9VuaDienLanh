import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/app-error.js';
import { listResponse, parseListQuery } from '../lib/pagination.js';
import { optionalDate, positiveId, requireObject, string } from '../lib/validation.js';
import { validateTransition } from '../lib/repair-state-machine.js';

const sorts = {
  code: 'ro.code',
  receivedAt: 'ro.received_at',
  createdAt: 'ro.created_at',
  repairStatus: 'ro.repair_status'
};

function orderPayload(body) {
  requireObject(body);
  return {
    deviceId: positiveId(body.deviceId, 'deviceId'),
    originalRepairOrderId: body.originalRepairOrderId !== undefined && body.originalRepairOrderId !== null ? positiveId(body.originalRepairOrderId, 'originalRepairOrderId') : null,
    reportedIssue: string(body.reportedIssue, 'reportedIssue', { required: true, min: 1, max: 5000 }),
    intakeCondition: string(body.intakeCondition, 'intakeCondition', { max: 5000 }),
    promisedAt: optionalDate(body.promisedAt, 'promisedAt'),
    notes: string(body.notes, 'notes', { max: 5000 })
  };
}

function transitionPayload(body) {
  requireObject(body);
  const toStatus = string(body.toStatus, 'toStatus', { required: true, min: 1, max: 30 });
  const reason = string(body.reason, 'reason', { max: 500 });
  if (body.override !== undefined && typeof body.override !== 'boolean') {
    throw new AppError(422, 'VALIDATION_ERROR', 'override must be boolean');
  }
  return { toStatus, reason, override: body.override === true };
}

function map(row) {
  const totalAmount = Number(row.labor_total ?? 0) + Number(row.parts_total ?? 0) - Number(row.discount_total ?? 0) + Number(row.tax_total ?? 0);
  const totalPaid = Number(row.total_paid ?? 0);
  const balance = Math.max(0, totalAmount - totalPaid);

  return {
    id: row.id,
    code: row.code,
    orderCode: row.code,
    branchId: row.branch_id,
    customerId: row.customer_id,
    customerName: row.customer_name ?? null,
    customerPhone: row.request_contact_phone || row.customer_phone || null,
    customerAddress: row.customer_address || (row.notes?.startsWith('Địa chỉ') ? row.notes.replace('Địa chỉ sửa chữa: ', '') : null),
    deviceId: row.device_id,
    deviceType: row.device_type_name ?? null,
    deviceBrand: row.device_brand ?? null,
    deviceModel: row.device_model ?? null,
    brand: row.device_brand ?? null,
    model: row.device_model ?? null,
    preferredDatetime: row.preferred_datetime ?? null,
    originalRepairOrderId: row.original_repair_order_id ?? null,
    originalRepairOrderCode: row.original_repair_order_code ?? null,
    receivedByUserId: row.received_by_user_id,
    assignedTechnicianId: row.assigned_technician_id ?? null,
    assignedTechnicianName: row.assigned_technician_name ?? null,
    assignedTechnicianPhone: row.assigned_technician_phone ?? null,
    repairStatus: row.repair_status,
    intakeCondition: row.intake_condition,
    reportedIssue: row.reported_issue,
    rejectionReason: row.rejection_reason ?? null,
    receivedAt: row.received_at,
    promisedAt: row.promised_at,
    completedAt: row.completed_at,
    paidAt: row.paid_at ?? null,
    deliveredAt: row.delivered_at,
    laborTotal: Number(row.labor_total ?? 0),
    partsTotal: Number(row.parts_total ?? 0),
    discountTotal: Number(row.discount_total ?? 0),
    taxTotal: Number(row.tax_total ?? 0),
    totalAmount,
    totalReceivable: totalAmount,
    totalPaid,
    totalCollected: totalPaid,
    balance,
    balanceDue: balance,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapHistory(row) {
  return {
    id: row.id,
    repairOrderId: row.repair_order_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedByUserId: row.changed_by_user_id,
    reason: row.reason,
    changedAt: row.changed_at
  };
}

export function createRepairOrderService(db) {
  const select = `
    SELECT ro.*,
           ra.technician_user_id AS assigned_technician_id,
           tu.full_name AS assigned_technician_name,
           tu.phone AS assigned_technician_phone,
           orig_ro.code AS original_repair_order_code,
           c.full_name AS customer_name,
           c.phone AS customer_phone,
           c.address_line AS customer_address,
           d.brand AS device_brand,
           d.model AS device_model,
           d.serial_number AS device_serial,
           dt.name AS device_type_name,
           sr.preferred_datetime AS preferred_datetime,
           sr.contact_phone AS request_contact_phone,
           COALESCE(pay.total_paid, 0) AS total_paid
    FROM repair_orders ro
    LEFT JOIN repair_assignments ra ON ra.repair_order_id = ro.id AND ra.unassigned_at IS NULL
    LEFT JOIN users tu ON tu.id = ra.technician_user_id
    LEFT JOIN repair_orders orig_ro ON orig_ro.id = ro.original_repair_order_id
    LEFT JOIN customers c ON c.id = ro.customer_id
    LEFT JOIN devices d ON d.id = ro.device_id
    LEFT JOIN device_types dt ON dt.id = d.device_type_id
    LEFT JOIN service_requests sr ON sr.id = ro.service_request_id
    LEFT JOIN (
      SELECT repair_order_id, SUM(amount) AS total_paid
      FROM payments
      WHERE status = 'VALID'
      GROUP BY repair_order_id
    ) pay ON pay.repair_order_id = ro.id
  `;

  async function getOrder(id, executor = db) {
    const [rows] = await executor.query(`${select} WHERE ro.id = ?`, [id]);
    if (!rows.length) {
      throw new AppError(404, 'REPAIR_ORDER_NOT_FOUND', 'Repair order was not found');
    }
    return rows[0];
  }

  return {
    async list(query) {
      const q = { sortOrder: 'desc', ...query };
      const page = parseListQuery(q, Object.keys(sorts), 'createdAt');
      const clauses = [];
      const values = [];
      if (query.customerId !== undefined) {
        clauses.push('ro.customer_id = ?');
        values.push(positiveId(query.customerId, 'customerId'));
      }
      if (query.deviceId !== undefined) {
        clauses.push('ro.device_id = ?');
        values.push(positiveId(query.deviceId, 'deviceId'));
      }
      if (query.assignedTechnicianId !== undefined) {
        clauses.push('EXISTS (SELECT 1 FROM repair_assignments ra WHERE ra.repair_order_id = ro.id AND ra.technician_user_id = ? AND ra.unassigned_at IS NULL)');
        values.push(positiveId(query.assignedTechnicianId, 'assignedTechnicianId'));
      }
      if (query.search && typeof query.search === 'string' && query.search.trim()) {
        const term = `%${query.search.trim()}%`;
        clauses.push('(ro.code LIKE ? OR ro.reported_issue LIKE ?)');
        values.push(term, term);
      }
      const rawStatus = query.repairStatus !== undefined ? query.repairStatus : query.status;
      if (rawStatus !== undefined) {
        const st = string(rawStatus, 'repairStatus', { required: true, max: 30 });
        if (st === 'PENDING' || st === 'PENDING_RECEPTION') {
          clauses.push("ro.repair_status IN ('PENDING', 'PENDING_RECEPTION')");
        } else if (st === 'ACCEPTED' || st === 'RECEIVED') {
          clauses.push("ro.repair_status IN ('ACCEPTED', 'RECEIVED')");
        } else {
          clauses.push('ro.repair_status = ?');
          values.push(st);
        }
      }
      if (query.originalRepairOrderId !== undefined) {
        clauses.push('ro.original_repair_order_id = ?');
        values.push(positiveId(query.originalRepairOrderId, 'originalRepairOrderId'));
      }
      const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
      const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM repair_orders ro${where}`, values);
      const [rows] = await db.query(
        `${select}${where} ORDER BY ${sorts[page.sortBy]} ${page.sortOrder} LIMIT ? OFFSET ?`,
        [...values, page.pageSize, page.offset]
      );
      return listResponse(rows.map(map), count.total, page.page, page.pageSize);
    },

    async get(id) {
      return map(await getOrder(id));
    },

    async create(body, auth) {
      const value = orderPayload(body);
      const [devices] = await db.query(
        'SELECT d.id, d.customer_id FROM devices d JOIN customers c ON c.id = d.customer_id WHERE d.id = ? AND d.is_active = 1 AND c.is_active = 1',
        [value.deviceId]
      );
      if (!devices.length) {
        throw new AppError(422, 'ACTIVE_DEVICE_REQUIRED', 'An active device with an active customer is required');
      }
      if (!auth.branchId) {
        throw new AppError(422, 'BRANCH_REQUIRED', 'The authenticated user must have a branch');
      }

      if (value.originalRepairOrderId) {
        const [orig] = await db.query('SELECT id, customer_id, device_id FROM repair_orders WHERE id = ?', [value.originalRepairOrderId]);
        if (!orig.length) {
          throw new AppError(422, 'ORIGINAL_REPAIR_ORDER_NOT_FOUND', 'Original repair order was not found');
        }
        if (orig[0].device_id !== value.deviceId) {
          throw new AppError(422, 'DEVICE_MISMATCH', 'Warranty claim must be for the same device as the original order');
        }
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const code = `RO-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
        const [result] = await connection.query(
          `INSERT INTO repair_orders (branch_id, customer_id, device_id, original_repair_order_id, received_by_user_id, code, repair_status, intake_condition, reported_issue, promised_at, notes)
           VALUES (?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?, ?, ?)`,
          [auth.branchId, devices[0].customer_id, value.deviceId, value.originalRepairOrderId, auth.user.id, code, value.intakeCondition, value.reportedIssue, value.promisedAt, value.notes]
        );
        await connection.query(
          'INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, ?, ?, ?)',
          [result.insertId, null, 'RECEIVED', auth.user.id, value.originalRepairOrderId ? `Warranty intake from original order #${value.originalRepairOrderId}` : 'Initial intake']
        );
        await connection.commit();
        return this.get(result.insertId);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },

    async history(id) {
      await getOrder(id);
      const [rows] = await db.query(
        'SELECT * FROM repair_status_history WHERE repair_order_id = ? ORDER BY changed_at, id',
        [id]
      );
      return rows.map(mapHistory);
    },

    async transition(id, body, auth) {
      const value = transitionPayload(body);
      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const order = await getOrder(id, connection);

        const isManager =
          auth.permissions.includes('operations.manage') ||
          auth.permissions.includes('system.manage') ||
          auth.roles.includes('ADMIN') ||
          auth.roles.includes('MANAGER');

        const isReceptionist =
          auth.permissions.includes('intake.manage') ||
          auth.roles.includes('RECEPTIONIST');

        const isAccountant =
          auth.permissions.includes('billing.manage') ||
          auth.roles.includes('ACCOUNTANT');

        const canReceptionistTransition =
          isReceptionist &&
          (
            (order.repair_status === 'PENDING' && (value.toStatus === 'ACCEPTED' || value.toStatus === 'REJECTED' || value.toStatus === 'CANCELLED')) ||
            (order.repair_status === 'PENDING_RECEPTION' && (value.toStatus === 'ACCEPTED' || value.toStatus === 'RECEIVED' || value.toStatus === 'REJECTED' || value.toStatus === 'CANCELLED')) ||
            (order.repair_status === 'WAITING_PAYMENT' && (value.toStatus === 'COMPLETED' || value.toStatus === 'CANCELLED')) ||
            ((order.repair_status === 'READY_FOR_PICKUP' || order.repair_status === 'PAID') && value.toStatus === 'DELIVERED') ||
            (order.repair_status === 'ACCEPTED' && value.toStatus === 'CANCELLED') ||
            (order.repair_status === 'RECEIVED' && value.toStatus === 'CANCELLED')
          );

        const canAccountantTransition =
          isAccountant &&
          (
            (order.repair_status === 'COMPLETED' && (value.toStatus === 'PAID' || value.toStatus === 'DELIVERED')) ||
            (order.repair_status === 'WAITING_PAYMENT' && (value.toStatus === 'PAID' || value.toStatus === 'COMPLETED' || value.toStatus === 'DELIVERED')) ||
            (order.repair_status === 'PAID' && value.toStatus === 'DELIVERED')
          );

        if (!isManager && !canReceptionistTransition && !canAccountantTransition) {
          const [assigned] = await connection.query(
            'SELECT id FROM repair_assignments WHERE repair_order_id = ? AND technician_user_id = ? AND unassigned_at IS NULL',
            [id, auth.user.id]
          );
          if (!assigned.length) {
            throw new AppError(403, 'NOT_ASSIGNED', 'Technician is not assigned to this repair order');
          }
        }

        const { exceptionalRepairing } = validateTransition(order.repair_status, value.toStatus, { ...value, roles: auth.roles });

        if ((value.toStatus === 'REPAIRING' || value.toStatus === 'IN_PROGRESS') && !exceptionalRepairing) {
          const [quotes] = await connection.query(
            "SELECT id FROM quotes WHERE repair_order_id = ? AND status = 'APPROVED' LIMIT 1",
            [id]
          );
          if (!quotes.length) {
            throw new AppError(409, 'APPROVED_QUOTE_REQUIRED', 'Phải có báo giá được khách hàng chấp thuận (APPROVED) trước khi tiến hành sửa chữa');
          }
        }

        // Rule 4: DELIVERED or PAID requires zero remaining balance (unless manager override)
        if ((value.toStatus === 'DELIVERED' || value.toStatus === 'PAID') && !value.override) {
          const totalReceivable = Number((Number(order.labor_total) + Number(order.parts_total) - Number(order.discount_total) + Number(order.tax_total)).toFixed(2));
          const [[paidRow]] = await connection.query(
            "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE repair_order_id = ? AND status = 'VALID'",
            [id]
          );
          const totalPaid = Number(Number(paidRow.total_paid).toFixed(2));
          const balance = Number((totalReceivable - totalPaid).toFixed(2));
          if (balance > 0 && totalReceivable > 0) {
            throw new AppError(409, 'OUTSTANDING_BALANCE_REMAINING', `Cannot complete payment or deliver device with outstanding unpaid balance of ${balance}`);
          }
        }

        const isOverride = value.override && (value.toStatus === 'REPAIRING' || value.toStatus === 'DELIVERED' || value.toStatus === 'PAID') && isManager;

        const isReceived = value.toStatus === 'RECEIVED' || value.toStatus === 'ACCEPTED';
        const isCompleted = value.toStatus === 'READY_FOR_PICKUP' || value.toStatus === 'UNREPAIRABLE' || value.toStatus === 'COMPLETED';
        const isPaid = value.toStatus === 'PAID';
        const isDelivered = value.toStatus === 'DELIVERED';
        const isRejected = value.toStatus === 'REJECTED';

        await connection.query(
          `UPDATE repair_orders
           SET repair_status = ?,
               rejection_reason = CASE WHEN ? THEN ? ELSE rejection_reason END,
               received_at = CASE WHEN ? AND received_at IS NULL THEN UTC_TIMESTAMP() ELSE received_at END,
               received_by_user_id = CASE WHEN ? AND (received_by_user_id IS NULL OR received_by_user_id = customer_id) THEN ? ELSE received_by_user_id END,
               completed_at = CASE WHEN ? THEN UTC_TIMESTAMP() ELSE completed_at END,
               paid_at = CASE WHEN ? THEN UTC_TIMESTAMP() ELSE paid_at END,
               delivered_at = CASE WHEN ? THEN UTC_TIMESTAMP() ELSE delivered_at END
           WHERE id = ?`,
          [
            value.toStatus,
            isRejected, value.reason,
            isReceived,
            isReceived, auth.user.id,
            isCompleted,
            isPaid,
            isDelivered,
            id
          ]
        );

        if (isReceived && order.service_request_id) {
          await connection.query(
            "UPDATE service_requests SET status = 'CONVERTED' WHERE id = ?",
            [order.service_request_id]
          );
        } else if ((value.toStatus === 'CANCELLED' || isRejected) && order.service_request_id) {
          await connection.query(
            "UPDATE service_requests SET status = 'CANCELLED' WHERE id = ?",
            [order.service_request_id]
          );
        }

        await connection.query(
          'INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, ?, ?, ?)',
          [id, order.repair_status, value.toStatus, auth.user.id, isOverride ? `OVERRIDE: ${value.reason}` : value.reason]
        );

        await connection.commit();
        return this.get(id);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }
  };
}
