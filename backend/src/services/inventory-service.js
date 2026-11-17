import { AppError } from '../lib/app-error.js';
import { listResponse, parseListQuery } from '../lib/pagination.js';
import { positiveId, requireObject, string } from '../lib/validation.js';

const VALID_TYPES = ['RECEIPT', 'ISSUE', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT'];
const ITEM_SORTS = { name: 'name', sku: 'sku', createdAt: 'created_at' };
const STOCK_SORTS = { updatedAt: 'updated_at', itemId: 'inventory_item_id', warehouseId: 'warehouse_id' };
const TX_SORTS = { performedAt: 'occurred_at', createdAt: 'created_at' };

function validateAmount(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new AppError(422, 'VALIDATION_ERROR', `${field} must be a non-negative number`);
  }
  return n;
}

function validatePositiveNumber(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppError(422, 'VALIDATION_ERROR', `${field} must be greater than 0`);
  }
  return n;
}

export function createInventoryService(db) {
  return {
    // ── Items ─────────────────────────────────────────────────────────────────

    async listItems(query) {
      const page = parseListQuery(query, Object.keys(ITEM_SORTS), 'name');
      const clauses = [];
      const values = [];

      if (query.search !== undefined && query.search !== '') {
        clauses.push('(name LIKE ? OR sku LIKE ?)');
        const like = `%${query.search}%`;
        values.push(like, like);
      }
      if (query.isActive !== undefined) {
        clauses.push('is_active = ?');
        values.push(query.isActive === 'true' || query.isActive === true ? 1 : 0);
      }

      const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
      const sortCol = ITEM_SORTS[page.sortBy];
      const [[count]] = await db.query(`SELECT COUNT(*) AS total FROM inventory_items${where}`, values);
      const [rows] = await db.query(
        `SELECT id, sku, name, unit, standard_cost AS standardCost, default_sale_price AS defaultSalePrice,
                reorder_level AS reorderLevel, is_active AS isActive, created_at AS createdAt, updated_at AS updatedAt
         FROM inventory_items${where} ORDER BY ${sortCol} ${page.sortOrder} LIMIT ? OFFSET ?`,
        [...values, page.pageSize, page.offset]
      );
      return listResponse(rows, count.total, page.page, page.pageSize);
    },

    async createItem(body) {
      requireObject(body);
      const sku = string(body.sku, 'sku', { required: true, min: 1, max: 64 });
      const name = string(body.name, 'name', { required: true, min: 1, max: 200 });
      const unit = string(body.unit, 'unit', { required: true, min: 1, max: 20 });
      const standardCost = validateAmount(body.standardCost ?? 0, 'standardCost');
      const defaultSalePrice = validateAmount(body.defaultSalePrice ?? 0, 'defaultSalePrice');
      const reorderLevel = validateAmount(body.reorderLevel ?? 0, 'reorderLevel');

      // Check SKU uniqueness
      const [existing] = await db.query('SELECT id FROM inventory_items WHERE sku = ?', [sku]);
      if (existing.length) {
        throw new AppError(409, 'SKU_DUPLICATE', `SKU '${sku}' already exists`);
      }

      const [result] = await db.query(
        `INSERT INTO inventory_items (sku, name, unit, standard_cost, default_sale_price, reorder_level)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sku, name, unit, standardCost, defaultSalePrice, reorderLevel]
      );
      return this.getItem(result.insertId);
    },

    async getItem(id) {
      const [rows] = await db.query(
        `SELECT i.id, i.sku, i.name, i.unit,
                i.standard_cost AS standardCost,
                i.default_sale_price AS defaultSalePrice,
                i.reorder_level AS reorderLevel,
                i.is_active AS isActive,
                i.created_at AS createdAt,
                i.updated_at AS updatedAt,
                COALESCE(SUM(s.quantity_on_hand), 0) AS totalOnHand,
                COALESCE(SUM(s.quantity_reserved), 0) AS totalReserved
         FROM inventory_items i
         LEFT JOIN inventory_stocks s ON s.inventory_item_id = i.id
         WHERE i.id = ?
         GROUP BY i.id`,
        [id]
      );
      if (!rows.length) {
        throw new AppError(404, 'ITEM_NOT_FOUND', 'Inventory item not found');
      }
      return rows[0];
    },

    async updateItem(id, body) {
      requireObject(body);
      const [existing] = await db.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
      if (!existing.length) {
        throw new AppError(404, 'ITEM_NOT_FOUND', 'Inventory item not found');
      }

      const sets = [];
      const values = [];

      if (body.name !== undefined) {
        sets.push('name = ?');
        values.push(string(body.name, 'name', { required: true, min: 1, max: 200 }));
      }
      if (body.unit !== undefined) {
        sets.push('unit = ?');
        values.push(string(body.unit, 'unit', { required: true, min: 1, max: 20 }));
      }
      if (body.standardCost !== undefined) {
        sets.push('standard_cost = ?');
        values.push(validateAmount(body.standardCost, 'standardCost'));
      }
      if (body.defaultSalePrice !== undefined) {
        sets.push('default_sale_price = ?');
        values.push(validateAmount(body.defaultSalePrice, 'defaultSalePrice'));
      }
      if (body.reorderLevel !== undefined) {
        sets.push('reorder_level = ?');
        values.push(validateAmount(body.reorderLevel, 'reorderLevel'));
      }
      if (body.isActive !== undefined) {
        if (typeof body.isActive !== 'boolean') {
          throw new AppError(422, 'VALIDATION_ERROR', 'isActive must be boolean');
        }
        sets.push('is_active = ?');
        values.push(body.isActive ? 1 : 0);
      }

      if (!sets.length) {
        throw new AppError(422, 'VALIDATION_ERROR', 'No fields to update');
      }

      values.push(id);
      await db.query(`UPDATE inventory_items SET ${sets.join(', ')} WHERE id = ?`, values);
      return this.getItem(id);
    },

    // ── Stocks ────────────────────────────────────────────────────────────────

    async listStocks(query) {
      const page = parseListQuery(query, Object.keys(STOCK_SORTS), 'updatedAt');
      const clauses = [];
      const values = [];

      if (query.warehouseId !== undefined) {
        clauses.push('s.warehouse_id = ?');
        values.push(positiveId(query.warehouseId, 'warehouseId'));
      }
      if (query.itemId !== undefined) {
        clauses.push('s.inventory_item_id = ?');
        values.push(positiveId(query.itemId, 'itemId'));
      }
      if (query.lowStock === 'true' || query.lowStock === true) {
        clauses.push('s.quantity_on_hand <= i.reorder_level');
      }

      const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
      const sortCol = `s.${STOCK_SORTS[page.sortBy]}`;
      const base = `FROM inventory_stocks s JOIN inventory_items i ON i.id = s.inventory_item_id JOIN warehouses w ON w.id = s.warehouse_id`;
      const [[count]] = await db.query(`SELECT COUNT(*) AS total ${base}${where}`, values);
      const [rows] = await db.query(
        `SELECT s.id, s.warehouse_id AS warehouseId, w.name AS warehouseName,
                s.inventory_item_id AS itemId, i.sku, i.name AS itemName, i.unit, i.reorder_level AS reorderLevel,
                s.quantity_on_hand AS quantityOnHand, s.quantity_reserved AS quantityReserved,
                s.updated_at AS updatedAt
         ${base}${where} ORDER BY ${sortCol} ${page.sortOrder} LIMIT ? OFFSET ?`,
        [...values, page.pageSize, page.offset]
      );
      return listResponse(rows, count.total, page.page, page.pageSize);
    },

    async getStock(warehouseId, itemId) {
      const wId = positiveId(warehouseId, 'warehouseId');
      const iId = positiveId(itemId, 'itemId');
      const [rows] = await db.query(
        `SELECT s.id, s.warehouse_id AS warehouseId, w.name AS warehouseName,
                s.inventory_item_id AS itemId, i.sku, i.name AS itemName, i.unit, i.reorder_level AS reorderLevel,
                s.quantity_on_hand AS quantityOnHand, s.quantity_reserved AS quantityReserved,
                s.updated_at AS updatedAt
         FROM inventory_stocks s
         JOIN inventory_items i ON i.id = s.inventory_item_id
         JOIN warehouses w ON w.id = s.warehouse_id
         WHERE s.warehouse_id = ? AND s.inventory_item_id = ?`,
        [wId, iId]
      );
      if (!rows.length) {
        throw new AppError(404, 'STOCK_NOT_FOUND', 'Stock record not found for this warehouse/item combination');
      }
      return rows[0];
    },

    // ── Transactions ──────────────────────────────────────────────────────────

    async addTransaction(body, auth) {
      requireObject(body);
      const warehouseId = positiveId(body.warehouseId, 'warehouseId');
      const inventoryItemId = positiveId(body.inventoryItemId, 'inventoryItemId');
      const transactionType = string(body.transactionType, 'transactionType', { required: true, max: 20 });
      if (!VALID_TYPES.includes(transactionType)) {
        throw new AppError(422, 'VALIDATION_ERROR', `transactionType must be one of ${VALID_TYPES.join(', ')}`);
      }
      const quantity = validatePositiveNumber(body.quantity, 'quantity');
      const unitCost = validateAmount(body.unitCostSnapshot ?? body.unitCost ?? 0, 'unitCostSnapshot');
      const note = string(body.note, 'note', { max: 500 });
      const referenceCode = string(body.referenceCode, 'referenceCode', { max: 64 });

      // Verify warehouse and item exist
      const [whs] = await db.query('SELECT id FROM warehouses WHERE id = ? AND is_active = 1', [warehouseId]);
      if (!whs.length) {
        throw new AppError(422, 'WAREHOUSE_NOT_FOUND', 'Active warehouse not found');
      }
      const [items] = await db.query('SELECT id FROM inventory_items WHERE id = ? AND is_active = 1', [inventoryItemId]);
      if (!items.length) {
        throw new AppError(422, 'ITEM_NOT_FOUND', 'Active inventory item not found');
      }

      const isOutgoing = transactionType === 'ISSUE' || transactionType === 'ADJUSTMENT_OUT';

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        if (isOutgoing) {
          // Lock the stock row before reading
          const [stocks] = await conn.query(
            'SELECT quantity_on_hand FROM inventory_stocks WHERE warehouse_id = ? AND inventory_item_id = ? FOR UPDATE',
            [warehouseId, inventoryItemId]
          );
          const currentQty = stocks.length ? Number(stocks[0].quantity_on_hand) : 0;
          if (currentQty < quantity) {
            await conn.rollback();
            throw new AppError(
              409,
              'INSUFFICIENT_STOCK',
              `Insufficient stock: requested ${quantity}, available ${currentQty}`
            );
          }
          // Deduct stock
          await conn.query(
            `UPDATE inventory_stocks SET quantity_on_hand = quantity_on_hand - ? WHERE warehouse_id = ? AND inventory_item_id = ?`,
            [quantity, warehouseId, inventoryItemId]
          );
        } else {
          // RECEIPT or ADJUSTMENT_IN: upsert stock record
          await conn.query(
            `INSERT INTO inventory_stocks (warehouse_id, inventory_item_id, quantity_on_hand)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand)`,
            [warehouseId, inventoryItemId, quantity]
          );
        }

        const [txResult] = await conn.query(
          `INSERT INTO inventory_transactions
           (warehouse_id, inventory_item_id, transaction_type, quantity, unit_cost, performed_by_user_id, note)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [warehouseId, inventoryItemId, transactionType, quantity, unitCost, auth.user.id, note]
        );

        await conn.commit();
        return {
          id: txResult.insertId,
          warehouseId,
          inventoryItemId,
          transactionType,
          quantity,
          unitCostSnapshot: unitCost,
          referenceCode,
          note,
          performedByUserId: auth.user.id
        };
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },

    async getTransactions(query) {
      const page = parseListQuery(query, Object.keys(TX_SORTS), 'performedAt');
      const clauses = [];
      const values = [];

      if (query.warehouseId !== undefined) {
        clauses.push('t.warehouse_id = ?');
        values.push(positiveId(query.warehouseId, 'warehouseId'));
      }
      if (query.itemId !== undefined) {
        clauses.push('t.inventory_item_id = ?');
        values.push(positiveId(query.itemId, 'itemId'));
      }
      if (query.orderId !== undefined) {
        clauses.push('t.repair_order_id = ?');
        values.push(positiveId(query.orderId, 'orderId'));
      }
      if (query.type !== undefined) {
        clauses.push('t.transaction_type = ?');
        values.push(string(query.type, 'type', { required: true, max: 20 }));
      }

      const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
      const sortCol = `t.${TX_SORTS[page.sortBy]}`;
      const base = `FROM inventory_transactions t
                    JOIN inventory_items i ON i.id = t.inventory_item_id
                    JOIN warehouses w ON w.id = t.warehouse_id`;
      const [[count]] = await db.query(`SELECT COUNT(*) AS total ${base}${where}`, values);
      const [rows] = await db.query(
        `SELECT t.id, t.warehouse_id AS warehouseId, w.name AS warehouseName,
                t.inventory_item_id AS itemId, i.sku, i.name AS itemName,
                t.repair_order_id AS repairOrderId,
                t.transaction_type AS transactionType,
                t.quantity, t.unit_cost AS unitCost,
                t.performed_by_user_id AS performedByUserId,
                t.occurred_at AS performedAt, t.note, t.created_at AS createdAt
         ${base}${where} ORDER BY ${sortCol} ${page.sortOrder} LIMIT ? OFFSET ?`,
        [...values, page.pageSize, page.offset]
      );
      return listResponse(rows, count.total, page.page, page.pageSize);
    }
  };
}
