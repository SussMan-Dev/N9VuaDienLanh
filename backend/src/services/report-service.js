export function createReportService(db) {
  return {
    async getSummary() {
      // 1. Repair orders by status
      const [statusRows] = await db.query(
        `SELECT repair_status AS status, COUNT(*) AS count
         FROM repair_orders
         GROUP BY repair_status`
      );

      // 2. Financial totals
      const [[finTotals]] = await db.query(
        `SELECT
           COALESCE(SUM(labor_total + parts_total - discount_total + tax_total), 0) AS totalReceivable,
           COALESCE(SUM(CASE WHEN repair_status = 'DELIVERED' THEN (labor_total + parts_total - discount_total + tax_total) ELSE 0 END), 0) AS deliveredTotal
         FROM repair_orders
         WHERE repair_status NOT IN ('CANCELLED')`
      );

      const [[payTotals]] = await db.query(
        `SELECT
           COALESCE(SUM(amount), 0) AS totalCollected,
           COUNT(*) AS totalTransactions
         FROM payments
         WHERE voided_at IS NULL`
      );

      const totalReceivable = Number(finTotals.totalReceivable);
      const totalCollected = Number(payTotals.totalCollected);
      const balanceDue = Math.max(0, totalReceivable - totalCollected);

      // 3. Inventory low stock count
      const [[invTotals]] = await db.query(
        `SELECT
           COUNT(DISTINCT i.id) AS totalItems,
           COUNT(DISTINCT CASE WHEN COALESCE(s.quantity_on_hand, 0) <= i.reorder_level THEN i.id END) AS lowStockItems
         FROM inventory_items i
         LEFT JOIN inventory_stocks s ON s.inventory_item_id = i.id
         WHERE i.is_active = 1`
      );

      // 4. Warranty stats
      const [[warrTotals]] = await db.query(
        `SELECT
           COUNT(*) AS totalWarranties,
           COUNT(CASE WHEN ends_at >= UTC_TIMESTAMP() THEN 1 END) AS activeWarranties
         FROM warranties`
      );

      const [[claimTotals]] = await db.query(
        `SELECT COUNT(*) AS totalClaims
         FROM repair_orders
         WHERE original_repair_order_id IS NOT NULL`
      );

      return {
        repairOrders: {
          byStatus: statusRows.reduce((acc, row) => {
            acc[row.status] = Number(row.count);
            return acc;
          }, {}),
          total: statusRows.reduce((sum, row) => sum + Number(row.count), 0),
        },
        financials: {
          totalReceivable,
          totalCollected,
          balanceDue,
          totalTransactions: Number(payTotals.totalTransactions),
        },
        inventory: {
          totalItems: Number(invTotals.totalItems),
          lowStockItems: Number(invTotals.lowStockItems),
        },
        warranty: {
          totalWarranties: Number(warrTotals.totalWarranties),
          activeWarranties: Number(warrTotals.activeWarranties),
          totalClaims: Number(claimTotals.totalClaims),
        },
      };
    },

    async listAllPayments(query = {}) {
      const clauses = [];
      const values = [];

      if (query.paymentMethod) {
        clauses.push('p.payment_method = ?');
        values.push(query.paymentMethod);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const [rows] = await db.query(
        `SELECT p.id,
                p.repair_order_id AS repairOrderId,
                ro.code AS repairOrderCode,
                c.full_name AS customerName,
                c.phone_number AS customerPhone,
                p.amount,
                p.payment_method AS paymentMethod,
                p.notes,
                p.received_at AS receivedAt,
                u.full_name AS receivedByName,
                p.voided_at AS voidedAt,
                p.void_reason AS voidReason
         FROM payments p
         JOIN repair_orders ro ON ro.id = p.repair_order_id
         JOIN customers c ON c.id = ro.customer_id
         JOIN users u ON u.id = p.received_by_user_id
         ${where}
         ORDER BY p.received_at DESC, p.id DESC
         LIMIT 100`,
        values
      );

      return { items: rows };
    },

    async listAllWarranties(query = {}) {
      const [rows] = await db.query(
        `SELECT w.id,
                w.warranty_code AS warrantyCode,
                w.repair_order_id AS repairOrderId,
                ro.code AS repairOrderCode,
                c.full_name AS customerName,
                c.phone_number AS customerPhone,
                d.device_type AS deviceType,
                d.brand,
                d.model,
                w.warranty_type AS warrantyType,
                w.duration_days AS durationDays,
                w.starts_at AS startsAt,
                w.ends_at AS endsAt,
                w.terms,
                (w.ends_at >= UTC_TIMESTAMP()) AS isActive,
                w.created_at AS createdAt
         FROM warranties w
         JOIN repair_orders ro ON ro.id = w.repair_order_id
         JOIN customers c ON c.id = ro.customer_id
         JOIN devices d ON d.id = ro.device_id
         ORDER BY w.created_at DESC
         LIMIT 100`
      );

      return { items: rows };
    },
  };
}

