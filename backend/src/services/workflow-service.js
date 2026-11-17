import { AppError } from '../lib/app-error.js';
import { optionalDate, positiveId, requireObject, string } from '../lib/validation.js';
import { createNotificationService } from './notification-service.js';

const notificationService = createNotificationService();

async function notifyAdmins(db, title, body, data) {
  try {
    const [admins] = await db.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.code IN ('ADMIN', 'MANAGER') AND u.is_active = 1`
    );
    if (admins.length) {
      await notificationService.sendNotification(db, {
        userIds: admins.map((a) => a.id),
        title,
        body,
        data,
      });
    }
  } catch (err) {
    console.warn('[WorkflowNotify] Error notifying admins:', err.message);
  }
}

async function notifyCustomer(db, repairOrderId, title, body, data) {
  try {
    const [rows] = await db.query(
      `SELECT u.id FROM users u
       JOIN repair_orders ro ON ro.customer_id = u.customer_id
       WHERE ro.id = ? AND u.is_active = 1`,
      [repairOrderId]
    );
    if (rows.length) {
      await notificationService.sendNotification(db, {
        userIds: rows.map((r) => r.id),
        title,
        body,
        data,
      });
    }
  } catch (err) {
    console.warn('[WorkflowNotify] Error notifying customer:', err.message);
  }
}

async function notifyTechnician(db, repairOrderId, title, body, data) {
  try {
    const [rows] = await db.query(
      `SELECT technician_user_id AS id FROM repair_assignments
       WHERE repair_order_id = ? AND unassigned_at IS NULL`,
      [repairOrderId]
    );
    if (rows.length) {
      await notificationService.sendNotification(db, {
        userIds: rows.map((r) => r.id),
        title,
        body,
        data,
      });
    }
  } catch (err) {
    console.warn('[WorkflowNotify] Error notifying tech:', err.message);
  }
}

function isManager(auth) {
  return (
    auth.permissions.includes('operations.manage') ||
    auth.permissions.includes('system.manage') ||
    auth.roles.includes('ADMIN') ||
    auth.roles.includes('MANAGER')
  );
}

export function createWorkflowService(db) {
  async function getActiveOrder(id, executor = db) {
    const [rows] = await executor.query('SELECT * FROM repair_orders WHERE id = ?', [id]);
    if (!rows.length) {
      throw new AppError(404, 'REPAIR_ORDER_NOT_FOUND', 'Repair order was not found');
    }
    return rows[0];
  }

  function assertNonTerminal(order) {
    if (['CANCELLED', 'DELIVERED', 'UNREPAIRABLE'].includes(order.repair_status)) {
      throw new AppError(409, 'INVALID_ORDER_STATUS', `Cannot perform this action on an order with status ${order.repair_status}`);
    }
  }

  async function assertAssignedTechnician(id, auth, executor = db) {
    if (isManager(auth)) return;
    const [assigned] = await executor.query(
      'SELECT id FROM repair_assignments WHERE repair_order_id = ? AND technician_user_id = ? AND unassigned_at IS NULL',
      [id, auth.user.id]
    );
    if (!assigned.length) {
      throw new AppError(403, 'NOT_ASSIGNED', 'Technician is not assigned to this repair order');
    }
  }

  return {
    async listAssignments(id) {
      await getActiveOrder(id);
      const [rows] = await db.query(
        `SELECT a.id,
                a.repair_order_id AS repairOrderId,
                a.technician_user_id AS technicianUserId,
                tu.full_name AS technicianName,
                a.assigned_by_user_id AS assignedByUserId,
                bu.full_name AS assignedByName,
                a.assigned_at AS assignedAt,
                a.unassigned_at AS unassignedAt,
                a.notes,
                (a.unassigned_at IS NULL) AS isActive
         FROM repair_assignments a
         JOIN users tu ON tu.id = a.technician_user_id
         JOIN users bu ON bu.id = a.assigned_by_user_id
         WHERE a.repair_order_id = ?
         ORDER BY a.assigned_at DESC, a.id DESC`,
        [id]
      );
      return { items: rows };
    },

    async assign(id, body, auth) {
      requireObject(body);
      const canAssign = isManager(auth);
      if (!canAssign) {
        throw new AppError(403, 'FORBIDDEN', 'Only managers or operations personnel can assign technicians');
      }
      const order = await getActiveOrder(id);
      assertNonTerminal(order);

      const techId = positiveId(body.technicianUserId, 'technicianUserId');
      const notes = string(body.notes, 'notes', { max: 500 });

      const [techs] = await db.query(
        `SELECT u.id, u.full_name
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE u.id = ? AND u.is_active = 1 AND r.code = 'TECHNICIAN'`,
        [techId]
      );
      if (!techs.length) {
        throw new AppError(422, 'TECHNICIAN_REQUIRED', 'An active technician is required');
      }

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(
          'UPDATE repair_assignments SET unassigned_at = UTC_TIMESTAMP() WHERE repair_order_id = ? AND unassigned_at IS NULL',
          [id]
        );
        const [result] = await connection.query(
          'INSERT INTO repair_assignments (repair_order_id, technician_user_id, assigned_by_user_id, notes) VALUES (?, ?, ?, ?)',
          [id, techId, auth.user.id, notes]
        );

        if (order.repair_status === 'ACCEPTED' || order.repair_status === 'RECEIVED') {
          await connection.query(
            "UPDATE repair_orders SET repair_status = 'ASSIGNED' WHERE id = ?",
            [id]
          );
          await connection.query(
            "INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, 'ASSIGNED', ?, ?)",
            [id, order.repair_status, auth.user.id, `Phân công kỹ thuật viên: ${techs[0].full_name}${notes ? ` (${notes})` : ''}`]
          );
        }

        await connection.commit();

        notifyTechnician(db, id, '🔧 Bạn có phân công mới', `Bạn vừa được phân công phiếu #${order.order_code || id}`, {
          repairOrderId: id,
          type: 'ASSIGNED',
        }).catch(() => {});

        return {
          id: result.insertId,
          repairOrderId: id,
          technicianUserId: techId,
          technicianName: techs[0].full_name,
          assignedByUserId: auth.user.id,
          notes
        };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },

    async listDiagnostics(id) {
      await getActiveOrder(id);
      const [rows] = await db.query(
        `SELECT d.id,
                d.repair_order_id AS repairOrderId,
                d.technician_user_id AS technicianUserId,
                tu.full_name AS technicianName,
                d.diagnosis_text AS diagnosisText,
                d.recommended_action AS recommendedAction,
                d.estimated_labor AS estimatedLabor,
                d.diagnosed_at AS diagnosedAt,
                d.created_at AS createdAt
         FROM diagnostics d
         JOIN users tu ON tu.id = d.technician_user_id
         WHERE d.repair_order_id = ?
         ORDER BY d.diagnosed_at DESC, d.id DESC`,
        [id]
      );
      return { items: rows };
    },

    async diagnose(id, body, auth) {
      requireObject(body);
      const order = await getActiveOrder(id);
      assertNonTerminal(order);
      await assertAssignedTechnician(id, auth);

      const diagnosisText = string(body.diagnosisText, 'diagnosisText', { required: true, min: 1, max: 5000 });
      const recommendedAction = string(body.recommendedAction, 'recommendedAction', { max: 5000 });
      const estimatedLabor = Number(body.estimatedLabor ?? 0);
      if (!Number.isFinite(estimatedLabor) || estimatedLabor < 0) {
        throw new AppError(422, 'VALIDATION_ERROR', 'estimatedLabor must be a non-negative number');
      }

      const [result] = await db.query(
        'INSERT INTO diagnostics (repair_order_id, technician_user_id, diagnosis_text, recommended_action, estimated_labor) VALUES (?, ?, ?, ?, ?)',
        [id, auth.user.id, diagnosisText, recommendedAction, estimatedLabor]
      );
      return {
        id: result.insertId,
        repairOrderId: id,
        technicianUserId: auth.user.id,
        diagnosisText,
        recommendedAction,
        estimatedLabor
      };
    },

    async listQuotes(id) {
      await getActiveOrder(id);
      const [rows] = await db.query(
        `SELECT q.id,
                q.repair_order_id AS repairOrderId,
                q.diagnostic_id AS diagnosticId,
                q.version_no AS versionNo,
                q.status,
                q.admin_approval_status AS adminApprovalStatus,
                q.admin_approved_by_user_id AS adminApprovedByUserId,
                au.full_name AS adminApprovedByName,
                q.admin_approved_at AS adminApprovedAt,
                q.admin_reject_note AS adminRejectNote,
                q.is_supplemental AS isSupplemental,
                q.labor_amount AS laborAmount,
                q.parts_amount AS partsAmount,
                q.discount_amount AS discountAmount,
                q.tax_amount AS taxAmount,
                (q.labor_amount + q.parts_amount - q.discount_amount + q.tax_amount) AS totalAmount,
                q.valid_until AS validUntil,
                q.created_by_user_id AS createdByUserId,
                u.full_name AS createdByName,
                q.created_at AS createdAt,
                q.updated_at AS updatedAt
         FROM quotes q
         JOIN users u ON u.id = q.created_by_user_id
         LEFT JOIN users au ON au.id = q.admin_approved_by_user_id
         WHERE q.repair_order_id = ?
         ORDER BY q.version_no DESC`,
        [id]
      );
      return { items: rows };
    },

    async getQuote(id, quoteId) {
      await getActiveOrder(id);
      const [quotes] = await db.query(
        `SELECT q.id,
                q.repair_order_id AS repairOrderId,
                q.diagnostic_id AS diagnosticId,
                q.version_no AS versionNo,
                q.status,
                q.admin_approval_status AS adminApprovalStatus,
                q.admin_approved_by_user_id AS adminApprovedByUserId,
                au.full_name AS adminApprovedByName,
                q.admin_approved_at AS adminApprovedAt,
                q.admin_reject_note AS adminRejectNote,
                q.is_supplemental AS isSupplemental,
                q.labor_amount AS laborAmount,
                q.parts_amount AS partsAmount,
                q.discount_amount AS discountAmount,
                q.tax_amount AS taxAmount,
                (q.labor_amount + q.parts_amount - q.discount_amount + q.tax_amount) AS totalAmount,
                q.valid_until AS validUntil,
                q.created_by_user_id AS createdByUserId,
                u.full_name AS createdByName,
                q.created_at AS createdAt,
                q.updated_at AS updatedAt
         FROM quotes q
         JOIN users u ON u.id = q.created_by_user_id
         LEFT JOIN users au ON au.id = q.admin_approved_by_user_id
         WHERE q.id = ? AND q.repair_order_id = ?`,
        [quoteId, id]
      );
      if (!quotes.length) {
        throw new AppError(404, 'QUOTE_NOT_FOUND', 'Quote was not found');
      }
      const quote = quotes[0];
      const [items] = await db.query(
        `SELECT id,
                quote_id AS quoteId,
                item_type AS itemType,
                description,
                quantity,
                unit_price AS unitPrice,
                line_total AS lineTotal
         FROM quote_items
         WHERE quote_id = ?
         ORDER BY id ASC`,
        [quoteId]
      );
      const [decisionHistory] = await db.query(
        `SELECT h.id,
                h.quote_id AS quoteId,
                h.decision,
                h.decided_by_user_id AS decidedByUserId,
                u.full_name AS decidedByName,
                h.decided_at AS decidedAt,
                h.customer_contact_name AS customerContactName,
                h.note
         FROM quote_decision_history h
         LEFT JOIN users u ON u.id = h.decided_by_user_id
         WHERE h.quote_id = ?
         ORDER BY h.decided_at DESC, h.id DESC`,
        [quoteId]
      );
      return {
        ...quote,
        items,
        decisionHistory
      };
    },

    async quote(id, body, auth) {
      requireObject(body);
      const order = await getActiveOrder(id);
      assertNonTerminal(order);
      await assertAssignedTechnician(id, auth);

      let diagnosticId = null;
      if (body.diagnosticId !== undefined && body.diagnosticId !== null) {
        diagnosticId = positiveId(body.diagnosticId, 'diagnosticId');
        const [diags] = await db.query('SELECT id FROM diagnostics WHERE id = ? AND repair_order_id = ?', [diagnosticId, id]);
        if (!diags.length) {
          throw new AppError(422, 'DIAGNOSTIC_NOT_FOUND', 'Diagnostic not found for this repair order');
        }
      }

      let laborAmount = Number(body.laborAmount ?? 0);
      let partsAmount = Number(body.partsAmount ?? 0);
      const validatedItems = [];

      if (body.items !== undefined) {
        if (!Array.isArray(body.items)) {
          throw new AppError(422, 'VALIDATION_ERROR', 'items must be an array');
        }
        let sumLabor = 0;
        let sumParts = 0;
        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i];
          requireObject(item);
          const itemType = string(item.itemType, `items[${i}].itemType`, { required: true, max: 20 });
          if (!['LABOR', 'PART'].includes(itemType)) {
            throw new AppError(422, 'VALIDATION_ERROR', `items[${i}].itemType must be LABOR or PART`);
          }
          const description = string(item.description, `items[${i}].description`, { required: true, min: 1, max: 500 });
          const quantity = Number(item.quantity ?? 1);
          if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new AppError(422, 'VALIDATION_ERROR', `items[${i}].quantity must be greater than 0`);
          }
          const unitPrice = Number(item.unitPrice ?? 0);
          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new AppError(422, 'VALIDATION_ERROR', `items[${i}].unitPrice must be non-negative`);
          }
          const lineTotal = Number((quantity * unitPrice).toFixed(2));
          if (itemType === 'LABOR') sumLabor += lineTotal;
          if (itemType === 'PART') sumParts += lineTotal;
          validatedItems.push({ itemType, description, quantity, unitPrice, lineTotal });
        }
        if (body.laborAmount === undefined) laborAmount = sumLabor;
        if (body.partsAmount === undefined) partsAmount = sumParts;
      }

      if (!Number.isFinite(laborAmount) || laborAmount < 0) {
        throw new AppError(422, 'VALIDATION_ERROR', 'laborAmount must be a non-negative number');
      }
      if (!Number.isFinite(partsAmount) || partsAmount < 0) {
        throw new AppError(422, 'VALIDATION_ERROR', 'partsAmount must be a non-negative number');
      }
      const discountAmount = Number(body.discountAmount ?? 0);
      if (!Number.isFinite(discountAmount) || discountAmount < 0) {
        throw new AppError(422, 'VALIDATION_ERROR', 'discountAmount must be a non-negative number');
      }
      const taxAmount = Number(body.taxAmount ?? 0);
      if (!Number.isFinite(taxAmount) || taxAmount < 0) {
        throw new AppError(422, 'VALIDATION_ERROR', 'taxAmount must be a non-negative number');
      }

      const validUntil = optionalDate(body.validUntil, 'validUntil');
      const note = string(body.note, 'note', { max: 500 });
      const isSupplemental = Boolean(body.isSupplemental);

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const [versions] = await connection.query(
          'SELECT COALESCE(MAX(version_no), 0) + 1 AS nextVersion FROM quotes WHERE repair_order_id = ? FOR UPDATE',
          [id]
        );
        const versionNo = versions[0].nextVersion;

        await connection.query(
          "UPDATE quotes SET status = 'SUPERSEDED' WHERE repair_order_id = ? AND status = 'PENDING_CUSTOMER'",
          [id]
        );

        const [quoteResult] = await connection.query(
          `INSERT INTO quotes (repair_order_id, diagnostic_id, version_no, status, admin_approval_status, is_supplemental, labor_amount, parts_amount, discount_amount, tax_amount, valid_until, created_by_user_id)
           VALUES (?, ?, ?, 'PENDING_CUSTOMER', 'PENDING', ?, ?, ?, ?, ?, ?, ?)`,
          [id, diagnosticId, versionNo, isSupplemental ? 1 : 0, laborAmount, partsAmount, discountAmount, taxAmount, validUntil, auth.user.id]
        );
        const quoteId = quoteResult.insertId;

        for (const item of validatedItems) {
          await connection.query(
            'INSERT INTO quote_items (quote_id, item_type, description, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?)',
            [quoteId, item.itemType, item.description, item.quantity, item.unitPrice, item.lineTotal]
          );
        }

        await connection.query(
          'INSERT INTO quote_decision_history (quote_id, decision, decided_by_user_id, note) VALUES (?, ?, ?, ?)',
          [quoteId, 'SENT', auth.user.id, note]
        );

        const needStatusUpdate = [
          'ASSIGNED',
          'DIAGNOSING',
          'RECEIVED',
          'ACCEPTED',
          'IN_PROGRESS',
          'WAITING_PARTS',
          'AWAITING_ADMIN_APPROVAL',
        ].includes(order.repair_status);

        if (needStatusUpdate) {
          await connection.query(
            "UPDATE repair_orders SET repair_status = 'AWAITING_ADMIN_APPROVAL' WHERE id = ?",
            [id]
          );
          const reasonText = isSupplemental
            ? `KTV lập báo giá bổ sung v${versionNo} do phát sinh linh kiện, gửi Admin thẩm định & phê duyệt`
            : `KTV lập báo giá v${versionNo} gửi Admin thẩm định & phê duyệt`;
          await connection.query(
            "INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, 'AWAITING_ADMIN_APPROVAL', ?, ?)",
            [id, order.repair_status, auth.user.id, reasonText]
          );
        }

        await connection.commit();

        if (needStatusUpdate) {
          notifyAdmins(db, '📑 Báo giá cần thẩm định', `Phiếu #${order.order_code || id} có báo giá v${versionNo} cần Admin duyệt`, {
            repairOrderId: id,
            quoteId,
            type: 'AWAITING_ADMIN_APPROVAL',
          }).catch(() => {});
        }

        return this.getQuote(id, quoteId);
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },

    async adminDecideQuote(id, quoteId, body, auth) {
      requireObject(body);
      const order = await getActiveOrder(id);
      assertNonTerminal(order);

      const isAdminOrManager =
        isManager(auth) ||
        (auth.roles && auth.roles.includes('ADMIN')) ||
        auth.permissions.includes('operations.manage') ||
        auth.permissions.includes('system.manage');

      if (!isAdminOrManager) {
        throw new AppError(403, 'FORBIDDEN', 'Chỉ Quản trị viên mới có quyền thẩm định và phê duyệt báo giá');
      }

      const decision = string(body.decision, 'decision', { required: true, max: 20 });
      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        throw new AppError(422, 'VALIDATION_ERROR', 'decision must be APPROVED or REJECTED');
      }
      const note = string(body.note, 'note', { max: 500 });

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const [quotes] = await connection.query(
          'SELECT * FROM quotes WHERE id = ? AND repair_order_id = ? FOR UPDATE',
          [quoteId, id]
        );
        if (!quotes.length) {
          throw new AppError(404, 'QUOTE_NOT_FOUND', 'Báo giá không tồn tại');
        }
        const quote = quotes[0];
        if (quote.status !== 'PENDING_CUSTOMER') {
          throw new AppError(409, 'QUOTE_NOT_PENDING', `Không thể phê duyệt báo giá có trạng thái ${quote.status}`);
        }

        if (decision === 'APPROVED') {
          await connection.query(
            `UPDATE quotes
             SET admin_approval_status = 'APPROVED',
                 admin_approved_by_user_id = ?,
                 admin_approved_at = UTC_TIMESTAMP(),
                 admin_reject_note = NULL
             WHERE id = ?`,
            [auth.user.id, quoteId]
          );
          await connection.query(
            "UPDATE repair_orders SET repair_status = 'AWAITING_CUSTOMER_APPROVAL' WHERE id = ?",
            [id]
          );
          await connection.query(
            "INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, 'AWAITING_CUSTOMER_APPROVAL', ?, ?)",
            [id, order.repair_status, auth.user.id, `Admin đã thẩm định & duyệt báo giá v${quote.version_no}, gửi khách hàng xác nhận`]
          );
        } else {
          await connection.query(
            `UPDATE quotes
             SET admin_approval_status = 'REJECTED',
                 admin_reject_note = ?
             WHERE id = ?`,
            [note || 'Admin yêu cầu điều chỉnh lại chi phí / phương án sửa chữa', quoteId]
          );
          await connection.query(
            "UPDATE repair_orders SET repair_status = 'ASSIGNED' WHERE id = ?",
            [id]
          );
          await connection.query(
            "INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, 'ASSIGNED', ?, ?)",
            [id, order.repair_status, auth.user.id, `Admin yêu cầu chỉnh sửa báo giá ${quote.is_supplemental ? 'bổ sung ' : ''}v${quote.version_no}: ${note || 'Cần điều chỉnh'}`]
          );
        }

        await connection.commit();

        if (decision === 'APPROVED') {
          notifyCustomer(db, id, '⚡ Báo giá sửa chữa đã sẵn sàng', `Báo giá phiếu #${order.order_code || id} đã được thẩm định. Vui lòng vào ứng dụng xem và xác nhận!`, {
            repairOrderId: id,
            quoteId,
            type: 'AWAITING_CUSTOMER_APPROVAL',
          }).catch(() => {});
        } else {
          notifyTechnician(db, id, '⚠️ Báo giá cần điều chỉnh', `Admin yêu cầu chỉnh sửa báo giá phiếu #${order.order_code || id}: ${note || ''}`, {
            repairOrderId: id,
            quoteId,
            type: 'QUOTE_REJECTED',
          }).catch(() => {});
        }

        return this.getQuote(id, quoteId);
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },

    async decide(id, quoteId, body, auth) {
      requireObject(body);
      const order = await getActiveOrder(id);
      assertNonTerminal(order);

      const isCustomer = auth.roles && auth.roles.includes('CUSTOMER');
      if (isCustomer) {
        let custId = auth.user.customerId;
        if (!custId) {
          const [[u]] = await db.query('SELECT customer_id FROM users WHERE id = ?', [auth.user.id]);
          custId = u?.customer_id;
        }
        if (Number(order.customer_id) !== Number(custId)) {
          throw new AppError(403, 'FORBIDDEN', 'Bạn chỉ có quyền phê duyệt báo giá trên đơn hàng của mình');
        }
      } else {
        const canStaffDecide =
          isManager(auth) ||
          auth.permissions.includes('intake.manage') ||
          auth.permissions.includes('repair.manage') ||
          auth.roles.includes('RECEPTIONIST');
        if (!canStaffDecide) {
          await assertAssignedTechnician(id, auth);
        }
      }

      const decision = string(body.decision, 'decision', { required: true, max: 20 });
      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        throw new AppError(422, 'VALIDATION_ERROR', 'decision must be APPROVED or REJECTED');
      }
      const customerContactName = string(body.customerContactName, 'customerContactName', { max: 160 }) || (isCustomer ? auth.user.fullName : undefined);
      const note = string(body.note, 'note', { max: 500 });

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const [quotes] = await connection.query(
          'SELECT * FROM quotes WHERE id = ? AND repair_order_id = ? FOR UPDATE',
          [quoteId, id]
        );
        if (!quotes.length) {
          throw new AppError(404, 'QUOTE_NOT_FOUND', 'Quote was not found');
        }
        const quote = quotes[0];
        if (quote.status !== 'PENDING_CUSTOMER') {
          throw new AppError(409, 'QUOTE_NOT_PENDING', `Cannot decide quote with status ${quote.status}`);
        }

        if (quote.admin_approval_status !== 'APPROVED') {
          throw new AppError(409, 'ADMIN_APPROVAL_REQUIRED', 'Báo giá này phải được Quản trị viên duyệt trước khi gửi khách hàng');
        }

        if (decision === 'APPROVED') {
          await connection.query('UPDATE quotes SET status = ? WHERE id = ?', ['APPROVED', quoteId]);
          await connection.query(
            "UPDATE quotes SET status = 'SUPERSEDED' WHERE repair_order_id = ? AND id != ? AND status IN ('PENDING_CUSTOMER', 'APPROVED')",
            [id, quoteId]
          );
          await connection.query(
            "UPDATE repair_orders SET labor_total = ?, parts_total = ?, discount_total = ?, tax_total = ?, repair_status = 'APPROVED' WHERE id = ?",
            [quote.labor_amount, quote.parts_amount, quote.discount_amount, quote.tax_amount, id]
          );
          await connection.query(
            "INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, 'APPROVED', ?, ?)",
            [id, order.repair_status, auth.user.id, `Khách hàng chấp thuận báo giá ${quote.is_supplemental ? 'bổ sung ' : ''}#${quoteId}`]
          );
        } else {
          await connection.query('UPDATE quotes SET status = ? WHERE id = ?', ['REJECTED', quoteId]);
          if (quote.is_supplemental) {
            await connection.query(
              "UPDATE repair_orders SET repair_status = 'ASSIGNED' WHERE id = ?",
              [id]
            );
            await connection.query(
              "INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, 'ASSIGNED', ?, ?)",
              [id, order.repair_status, auth.user.id, `Khách hàng từ chối báo giá bổ sung #${quoteId}: ${note || 'Giữ nguyên gói ban đầu'}`]
            );
          } else {
            await connection.query(
              "UPDATE repair_orders SET repair_status = 'CANCELLED' WHERE id = ?",
              [id]
            );
            await connection.query(
              "INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason) VALUES (?, ?, 'CANCELLED', ?, ?)",
              [id, order.repair_status, auth.user.id, `Khách hàng từ chối báo giá #${quoteId}: ${note || 'Không đồng ý chi phí'}`]
            );
          }
        }

        await connection.query(
          'INSERT INTO quote_decision_history (quote_id, decision, decided_by_user_id, customer_contact_name, note) VALUES (?, ?, ?, ?, ?)',
          [quoteId, decision, auth.user.id, customerContactName, note]
        );

        await connection.commit();

        if (decision === 'APPROVED') {
          notifyTechnician(db, id, '✅ Khách hàng đã duyệt báo giá', `Phiếu #${order.order_code || id} đã được khách chấp thuận. Bạn có thể bắt đầu sửa chữa!`, {
            repairOrderId: id,
            quoteId,
            type: 'APPROVED',
          }).catch(() => {});
        } else {
          notifyTechnician(db, id, '❌ Khách từ chối báo giá', `Phiếu #${order.order_code || id}: Khách không đồng ý báo giá. ${note ? `Lý do: ${note}` : ''}`, {
            repairOrderId: id,
            quoteId,
            type: 'CUSTOMER_REJECTED',
          }).catch(() => {});
        }

        return { id: quoteId, repairOrderId: id, status: decision };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }
  };
}
