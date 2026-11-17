import { AppError } from '../lib/app-error.js';
import { positiveId, requireObject, string } from '../lib/validation.js';

const ACTIVE_REPAIR_STATUSES = ['APPROVED', 'REPAIRING'];

export function createRepairPartsService(db) {
  async function getOrder(id, executor = db) {
    const [rows] = await executor.query(
      'SELECT id, branch_id, repair_status, parts_total FROM repair_orders WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      throw new AppError(404, 'REPAIR_ORDER_NOT_FOUND', 'Repair order not found');
    }
    return rows[0];
  }

  async function findWarehouseForBranch(branchId, executor = db) {
    const [rows] = await executor.query(
      'SELECT id FROM warehouses WHERE branch_id = ? AND is_active = 1 ORDER BY id LIMIT 1',
      [branchId]
    );
    return rows.length ? rows[0].id : null;
  }

  return {
    async listParts(orderId) {
      await getOrder(positiveId(orderId, 'orderId'));
      const [rows] = await db.query(
        `SELECT p.id, p.repair_order_id AS repairOrderId,
                p.inventory_item_id AS inventoryItemId, i.sku, i.name AS itemName,
                p.inventory_transaction_id AS inventoryTransactionId,
                p.description, p.quantity,
                p.unit_cost_snapshot AS unitCostSnapshot,
                p.unit_price_snapshot AS unitPriceSnapshot,
                p.line_total AS lineTotal,
                p.created_by_user_id AS createdByUserId,
                u.full_name AS createdByName,
                p.created_at AS createdAt
         FROM repair_order_parts p
         LEFT JOIN inventory_items i ON i.id = p.inventory_item_id
         JOIN users u ON u.id = p.created_by_user_id
         WHERE p.repair_order_id = ?
         ORDER BY p.created_at ASC, p.id ASC`,
        [orderId]
      );
      return { items: rows };
    },

    async addPart(orderId, body, auth) {
      requireObject(body);
      const id = positiveId(orderId, 'orderId');

      let inventoryItemId = null;
      if (body.inventoryItemId !== undefined && body.inventoryItemId !== null) {
        inventoryItemId = positiveId(body.inventoryItemId, 'inventoryItemId');
      }
      const description = string(body.description, 'description', { max: 500 });
      if (!inventoryItemId && !description) {
        throw new AppError(422, 'VALIDATION_ERROR', 'inventoryItemId or description is required');
      }
      const quantity = (() => {
        const n = Number(body.quantity ?? 1);
        if (!Number.isFinite(n) || n <= 0) {
          throw new AppError(422, 'VALIDATION_ERROR', 'quantity must be greater than 0');
        }
        return n;
      })();

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const order = await getOrder(id, conn);
        if (!ACTIVE_REPAIR_STATUSES.includes(order.repair_status)) {
          throw new AppError(
            409,
            'INVALID_ORDER_STATUS',
            `Cannot add parts to order with status ${order.repair_status}. Order must be APPROVED or REPAIRING.`
          );
        }

        let unitCostSnapshot = 0;
        let unitPriceSnapshot = 0;
        let actualDescription = description;
        let txId = null;

        if (inventoryItemId) {
          // Fetch item details
          const [items] = await conn.query(
            'SELECT id, name, standard_cost, default_sale_price FROM inventory_items WHERE id = ? AND is_active = 1',
            [inventoryItemId]
          );
          if (!items.length) {
            throw new AppError(422, 'ITEM_NOT_FOUND', 'Active inventory item not found');
          }
          const item = items[0];
          unitCostSnapshot = Number(item.standard_cost);
          unitPriceSnapshot =
            body.unitPriceSnapshot !== undefined
              ? (() => {
                  const n = Number(body.unitPriceSnapshot);
                  if (!Number.isFinite(n) || n < 0) {
                    throw new AppError(422, 'VALIDATION_ERROR', 'unitPriceSnapshot must be non-negative');
                  }
                  return n;
                })()
              : Number(item.default_sale_price);

          if (!actualDescription) {
            actualDescription = item.name;
          }

          // Find warehouse for this branch
          const warehouseId = await findWarehouseForBranch(order.branch_id, conn);
          if (warehouseId) {
            // Lock and check stock
            const [stocks] = await conn.query(
              'SELECT quantity_on_hand FROM inventory_stocks WHERE warehouse_id = ? AND inventory_item_id = ? FOR UPDATE',
              [warehouseId, inventoryItemId]
            );
            const currentQty = stocks.length ? Number(stocks[0].quantity_on_hand) : 0;
            if (currentQty < quantity) {
              throw new AppError(
                409,
                'INSUFFICIENT_STOCK',
                `Insufficient stock: requested ${quantity}, available ${currentQty}`
              );
            }

            // Deduct stock
            await conn.query(
              'UPDATE inventory_stocks SET quantity_on_hand = quantity_on_hand - ? WHERE warehouse_id = ? AND inventory_item_id = ?',
              [quantity, warehouseId, inventoryItemId]
            );

            // Insert transaction
            const [txResult] = await conn.query(
              `INSERT INTO inventory_transactions
               (warehouse_id, inventory_item_id, repair_order_id, transaction_type, quantity, unit_cost, performed_by_user_id)
               VALUES (?, ?, ?, 'ISSUE', ?, ?, ?)`,
              [warehouseId, inventoryItemId, id, quantity, unitCostSnapshot, auth.user.id]
            );
            txId = txResult.insertId;
          } else {
            // No warehouse found — still allow part addition without stock movement
            if (body.unitCostSnapshot !== undefined) {
              const n = Number(body.unitCostSnapshot);
              if (!Number.isFinite(n) || n < 0) {
                throw new AppError(422, 'VALIDATION_ERROR', 'unitCostSnapshot must be non-negative');
              }
              unitCostSnapshot = n;
            }
          }
        } else {
          // Manual description only
          unitCostSnapshot =
            body.unitCostSnapshot !== undefined
              ? (() => {
                  const n = Number(body.unitCostSnapshot);
                  if (!Number.isFinite(n) || n < 0) {
                    throw new AppError(422, 'VALIDATION_ERROR', 'unitCostSnapshot must be non-negative');
                  }
                  return n;
                })()
              : 0;
          unitPriceSnapshot =
            body.unitPriceSnapshot !== undefined
              ? (() => {
                  const n = Number(body.unitPriceSnapshot);
                  if (!Number.isFinite(n) || n < 0) {
                    throw new AppError(422, 'VALIDATION_ERROR', 'unitPriceSnapshot must be non-negative');
                  }
                  return n;
                })()
              : 0;
        }

        const lineTotal = Number((quantity * unitPriceSnapshot).toFixed(2));

        const [partResult] = await conn.query(
          `INSERT INTO repair_order_parts
           (repair_order_id, inventory_item_id, inventory_transaction_id, description, quantity,
            unit_cost_snapshot, unit_price_snapshot, line_total, created_by_user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, inventoryItemId, txId, actualDescription, quantity, unitCostSnapshot, unitPriceSnapshot, lineTotal, auth.user.id]
        );

        // Update repair_orders.parts_total
        await conn.query(
          'UPDATE repair_orders SET parts_total = parts_total + ? WHERE id = ?',
          [lineTotal, id]
        );

        await conn.commit();

        return {
          id: partResult.insertId,
          repairOrderId: id,
          inventoryItemId,
          inventoryTransactionId: txId,
          description: actualDescription,
          quantity,
          unitCostSnapshot,
          unitPriceSnapshot,
          lineTotal
        };
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },

    async removePart(orderId, partId, auth) {
      const oId = positiveId(orderId, 'orderId');
      const pId = positiveId(partId, 'partId');

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const order = await getOrder(oId, conn);
        if (!ACTIVE_REPAIR_STATUSES.includes(order.repair_status)) {
          throw new AppError(
            409,
            'INVALID_ORDER_STATUS',
            `Cannot remove parts from order with status ${order.repair_status}`
          );
        }

        // Lock the part row
        const [parts] = await conn.query(
          'SELECT * FROM repair_order_parts WHERE id = ? AND repair_order_id = ? FOR UPDATE',
          [pId, oId]
        );
        if (!parts.length) {
          throw new AppError(404, 'PART_NOT_FOUND', 'Repair part not found');
        }
        const part = parts[0];

        // Return stock if there was a linked transaction
        if (part.inventory_transaction_id) {
          // Get original issue transaction for warehouse
          const [txRows] = await conn.query(
            'SELECT warehouse_id, inventory_item_id FROM inventory_transactions WHERE id = ?',
            [part.inventory_transaction_id]
          );
          if (txRows.length) {
            const { warehouse_id: warehouseId, inventory_item_id: itemId } = txRows[0];
            // Upsert stock — return quantity to warehouse
            await conn.query(
              `INSERT INTO inventory_stocks (warehouse_id, inventory_item_id, quantity_on_hand)
               VALUES (?, ?, ?)
               ON DUPLICATE KEY UPDATE quantity_on_hand = quantity_on_hand + VALUES(quantity_on_hand)`,
              [warehouseId, itemId, Number(part.quantity)]
            );
            // Insert RETURN transaction
            await conn.query(
              `INSERT INTO inventory_transactions
               (warehouse_id, inventory_item_id, repair_order_id, transaction_type, quantity, unit_cost, performed_by_user_id)
               VALUES (?, ?, ?, 'RETURN', ?, ?, ?)`,
              [warehouseId, itemId, oId, Number(part.quantity), Number(part.unit_cost_snapshot), auth.user.id]
            );
          }
        }

        // Delete the part
        await conn.query('DELETE FROM repair_order_parts WHERE id = ?', [pId]);

        // Update parts_total
        await conn.query(
          'UPDATE repair_orders SET parts_total = GREATEST(0, parts_total - ?) WHERE id = ?',
          [Number(part.line_total), oId]
        );

        await conn.commit();
        return { deleted: true, id: pId };
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    }
  };
}
