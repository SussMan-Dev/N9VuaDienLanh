import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/app-error.js';
import { optionalDate, requireObject, string } from '../lib/validation.js';

export function createWarrantyService(db) {
  async function getOrder(id, executor = db) {
    const [rows] = await executor.query('SELECT * FROM repair_orders WHERE id = ?', [id]);
    if (!rows.length) {
      throw new AppError(404, 'REPAIR_ORDER_NOT_FOUND', 'Repair order was not found');
    }
    return rows[0];
  }

  return {
    async listWarranties(repairOrderId) {
      await getOrder(repairOrderId);
      const [rows] = await db.query(
        `SELECT w.id,
                w.repair_order_id AS repairOrderId,
                w.warranty_code AS warrantyCode,
                w.starts_at AS startsAt,
                w.ends_at AS endsAt,
                w.status,
                w.terms,
                w.created_at AS createdAt,
                w.updated_at AS updatedAt
         FROM warranties w
         WHERE w.repair_order_id = ?
         ORDER BY w.ends_at DESC`,
        [repairOrderId]
      );
      return { items: rows };
    },

    async createWarranty(repairOrderId, body, auth) {
      requireObject(body);
      const order = await getOrder(repairOrderId);

      if (['CANCELLED', 'UNREPAIRABLE'].includes(order.repair_status)) {
        throw new AppError(409, 'INVALID_ORDER_STATUS', `Cannot issue warranty for order with status ${order.repair_status}`);
      }

      const startsAt = optionalDate(body.startsAt, 'startsAt') ?? new Date().toISOString().slice(0, 10);
      const endsAt = optionalDate(body.endsAt, 'endsAt');
      if (!endsAt) {
        throw new AppError(422, 'VALIDATION_ERROR', 'endsAt is required (YYYY-MM-DD)');
      }
      if (Date.parse(`${endsAt}T00:00:00Z`) < Date.parse(`${startsAt}T00:00:00Z`)) {
        throw new AppError(422, 'VALIDATION_ERROR', 'endsAt must be after or equal to startsAt');
      }

      const terms = string(body.terms, 'terms', { max: 5000 });
      const warrantyCode = `WAR-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;

      const [result] = await db.query(
        `INSERT INTO warranties (repair_order_id, warranty_code, starts_at, ends_at, status, terms)
         VALUES (?, ?, ?, ?, 'ACTIVE', ?)`,
        [repairOrderId, warrantyCode, startsAt, endsAt, terms]
      );

      return {
        id: result.insertId,
        repairOrderId,
        warrantyCode,
        startsAt,
        endsAt,
        status: 'ACTIVE',
        terms
      };
    },

    async getByCode(warrantyCode) {
      const code = string(warrantyCode, 'warrantyCode', { required: true, max: 64 });
      const [rows] = await db.query(
        `SELECT w.id,
                w.repair_order_id AS repairOrderId,
                ro.code AS repairOrderCode,
                ro.customer_id AS customerId,
                c.full_name AS customerName,
                c.phone AS customerPhone,
                ro.device_id AS deviceId,
                d.brand AS deviceBrand,
                d.model AS deviceModel,
                w.warranty_code AS warrantyCode,
                w.starts_at AS startsAt,
                w.ends_at AS endsAt,
                w.status,
                w.terms,
                w.created_at AS createdAt
         FROM warranties w
         JOIN repair_orders ro ON ro.id = w.repair_order_id
         JOIN customers c ON c.id = ro.customer_id
         JOIN devices d ON d.id = ro.device_id
         WHERE w.warranty_code = ?`,
        [code]
      );
      if (!rows.length) {
        throw new AppError(404, 'WARRANTY_NOT_FOUND', 'Warranty was not found');
      }
      return rows[0];
    },

    async listWarrantyClaims(repairOrderId) {
      await getOrder(repairOrderId);
      const [rows] = await db.query(
        `SELECT ro.id,
                ro.code,
                ro.original_repair_order_id AS originalRepairOrderId,
                ro.repair_status AS repairStatus,
                ro.reported_issue AS reportedIssue,
                ro.received_at AS receivedAt,
                ro.created_at AS createdAt
         FROM repair_orders ro
         WHERE ro.original_repair_order_id = ?
         ORDER BY ro.created_at DESC`,
        [repairOrderId]
      );
      return { items: rows };
    }
  };
}

