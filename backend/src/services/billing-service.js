import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/app-error.js';
import { positiveId, requireObject, string } from '../lib/validation.js';

export function createBillingService(db) {
  async function getOrder(id, executor = db) {
    const [rows] = await executor.query('SELECT * FROM repair_orders WHERE id = ?', [id]);
    if (!rows.length) {
      throw new AppError(404, 'REPAIR_ORDER_NOT_FOUND', 'Repair order was not found');
    }
    return rows[0];
  }

  return {
    async getBillingSummary(repairOrderId, executor = db) {
      const order = await getOrder(repairOrderId, executor);
      const laborTotal = Number(order.labor_total ?? 0);
      const partsTotal = Number(order.parts_total ?? 0);
      const discountTotal = Number(order.discount_total ?? 0);
      const taxTotal = Number(order.tax_total ?? 0);
      const totalReceivable = Number((laborTotal + partsTotal - discountTotal + taxTotal).toFixed(2));

      const [[paidRow]] = await executor.query(
        "SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE repair_order_id = ? AND status = 'VALID'",
        [repairOrderId]
      );
      const totalPaid = Number(Number(paidRow.total_paid).toFixed(2));
      const balance = Number((totalReceivable - totalPaid).toFixed(2));

      let paymentStatus = 'UNPAID';
      if (totalPaid <= 0) {
        paymentStatus = 'UNPAID';
      } else if (balance > 0) {
        paymentStatus = 'PARTIALLY_PAID';
      } else if (balance === 0) {
        paymentStatus = 'PAID';
      } else {
        paymentStatus = 'OVERPAID';
      }

      return {
        repairOrderId,
        laborTotal,
        partsTotal,
        discountTotal,
        taxTotal,
        totalReceivable,
        totalPaid,
        balance,
        paymentStatus
      };
    },

    async listPayments(repairOrderId) {
      await getOrder(repairOrderId);
      const [rows] = await db.query(
        `SELECT p.id,
                p.repair_order_id AS repairOrderId,
                p.receipt_number AS receiptNumber,
                p.payment_method AS paymentMethod,
                p.status,
                p.amount,
                p.paid_at AS paidAt,
                p.reference_code AS referenceCode,
                p.note,
                p.received_by_user_id AS receivedByUserId,
                ru.full_name AS receivedByName,
                p.voided_at AS voidedAt,
                p.voided_by_user_id AS voidedByUserId,
                vu.full_name AS voidedByName,
                p.created_at AS createdAt
         FROM payments p
         JOIN users ru ON ru.id = p.received_by_user_id
         LEFT JOIN users vu ON vu.id = p.voided_by_user_id
         WHERE p.repair_order_id = ?
         ORDER BY p.paid_at DESC, p.id DESC`,
        [repairOrderId]
      );
      return { items: rows };
    },

    async createPayment(repairOrderId, body, auth) {
      requireObject(body);
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new AppError(422, 'VALIDATION_ERROR', 'amount must be a positive number');
      }

      const paymentMethod = string(body.paymentMethod, 'paymentMethod', { required: true, max: 20 });
      if (!['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'].includes(paymentMethod)) {
        throw new AppError(422, 'VALIDATION_ERROR', 'paymentMethod must be CASH, BANK_TRANSFER, CARD, or OTHER');
      }

      const referenceCode = string(body.referenceCode, 'referenceCode', { max: 120 });
      const note = string(body.note, 'note', { max: 500 });

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        const order = await getOrder(repairOrderId, connection);
        if (order.repair_status === 'CANCELLED') {
          throw new AppError(409, 'INVALID_ORDER_STATUS', 'Cannot record payment for a cancelled order');
        }

        const summary = await this.getBillingSummary(repairOrderId, connection);

        const isManager =
          auth.permissions.includes('operations.manage') ||
          auth.permissions.includes('system.manage') ||
          auth.roles.includes('ADMIN') ||
          auth.roles.includes('MANAGER');

        // Rule 6: Overpayment check
        if (amount > summary.balance && summary.balance > 0) {
          if (!isManager || !note) {
            throw new AppError(409, 'PAYMENT_EXCEEDS_BALANCE', 'Payment exceeds remaining balance; manager approval and note are required');
          }
        }

        const receiptNumber = `REC-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;

        const [result] = await connection.query(
          `INSERT INTO payments (repair_order_id, received_by_user_id, receipt_number, payment_method, status, amount, reference_code, note)
           VALUES (?, ?, ?, ?, 'VALID', ?, ?, ?)`,
          [repairOrderId, auth.user.id, receiptNumber, paymentMethod, amount, referenceCode, note]
        );

        // Check if fully paid and transition to PAID if in COMPLETED or WAITING_PAYMENT
        const newTotalPaid = Number((summary.totalPaid + amount).toFixed(2));
        const newBalance = Number((summary.totalReceivable - newTotalPaid).toFixed(2));
        if (newBalance <= 0 && ['COMPLETED', 'WAITING_PAYMENT'].includes(order.repair_status)) {
          await connection.query(
            "UPDATE repair_orders SET repair_status = 'PAID', paid_at = UTC_TIMESTAMP() WHERE id = ?",
            [repairOrderId]
          );
          await connection.query(
            `INSERT INTO repair_status_history (repair_order_id, from_status, to_status, changed_by_user_id, reason)
             VALUES (?, ?, 'PAID', ?, 'Khách hàng thanh toán hoàn tất đầy đủ 100% chi phí')`,
            [repairOrderId, order.repair_status, auth.user.id]
          );
        }

        await connection.commit();
        const updatedSummary = await this.getBillingSummary(repairOrderId);
        return {
          id: result.insertId,
          repairOrderId,
          receiptNumber,
          paymentMethod,
          status: 'VALID',
          amount,
          referenceCode,
          note,
          receivedByUserId: auth.user.id,
          billing: updatedSummary
        };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    },

    async voidPayment(repairOrderId, paymentId, body, auth) {
      requireObject(body);
      const isManager =
        auth.permissions.includes('operations.manage') ||
        auth.permissions.includes('system.manage') ||
        auth.roles.includes('ADMIN') ||
        auth.roles.includes('MANAGER');

      if (!isManager) {
        throw new AppError(403, 'FORBIDDEN', 'Only managers can void a payment');
      }

      const reason = string(body.reason, 'reason', { required: true, min: 1, max: 500 });

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        await getOrder(repairOrderId, connection);

        const [rows] = await connection.query(
          'SELECT * FROM payments WHERE id = ? AND repair_order_id = ? FOR UPDATE',
          [paymentId, repairOrderId]
        );
        if (!rows.length) {
          throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment was not found');
        }
        const payment = rows[0];
        if (payment.status !== 'VALID') {
          throw new AppError(409, 'PAYMENT_NOT_VALID', `Cannot void payment with status ${payment.status}`);
        }

        await connection.query(
          `UPDATE payments
           SET status = 'VOIDED',
               voided_at = UTC_TIMESTAMP(),
               voided_by_user_id = ?,
               note = CONCAT(COALESCE(note, ''), ' | VOID: ', ?)
           WHERE id = ?`,
          [auth.user.id, reason, paymentId]
        );

        await connection.commit();
        const updatedSummary = await this.getBillingSummary(repairOrderId);
        return {
          id: paymentId,
          status: 'VOIDED',
          reason,
          billing: updatedSummary
        };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }
  };
}

