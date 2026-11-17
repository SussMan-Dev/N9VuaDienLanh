/**
 * Unit tests for inventory validation logic — no real DB required.
 * Uses Node built-in test runner: `node --test test/inventory.test.js`
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/lib/app-error.js';
import { createInventoryService } from '../src/services/inventory-service.js';
import { createRepairPartsService } from '../src/services/repair-parts-service.js';

// ── Minimal mock DB that always resolves ──────────────────────────────────────
function makeDb(overrides = {}) {
  return {
    query: async () => [[], {}],
    getConnection: async () => ({
      beginTransaction: async () => {},
      query: async () => [[], {}],
      commit: async () => {},
      rollback: async () => {},
      release: () => {}
    }),
    ...overrides
  };
}

// ── inventory-service validation ──────────────────────────────────────────────
describe('createItem validation', () => {
  it('rejects missing sku', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.createItem({ name: 'Part', unit: 'piece' }),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.status, 422);
        assert.equal(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  it('rejects missing name', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.createItem({ sku: 'SKU001', unit: 'piece' }),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects missing unit', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.createItem({ sku: 'SKU001', name: 'Part' }),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects negative standardCost', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.createItem({ sku: 'SKU001', name: 'Part', unit: 'piece', standardCost: -1 }),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects negative defaultSalePrice', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.createItem({ sku: 'SKU001', name: 'Part', unit: 'piece', defaultSalePrice: -5 }),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects negative reorderLevel', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.createItem({ sku: 'SKU001', name: 'Part', unit: 'piece', reorderLevel: -1 }),
      (err) => err instanceof AppError && err.status === 422
    );
  });
});

describe('addTransaction validation', () => {
  const auth = { user: { id: 1 } };

  it('rejects invalid transactionType', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.addTransaction({ warehouseId: 1, inventoryItemId: 1, transactionType: 'IN', quantity: 5, unitCostSnapshot: 0 }, auth),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.status, 422);
        assert.equal(err.code, 'VALIDATION_ERROR');
        return true;
      }
    );
  });

  it('rejects zero quantity', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.addTransaction({ warehouseId: 1, inventoryItemId: 1, transactionType: 'RECEIPT', quantity: 0, unitCostSnapshot: 0 }, auth),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects negative quantity', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.addTransaction({ warehouseId: 1, inventoryItemId: 1, transactionType: 'RECEIPT', quantity: -3, unitCostSnapshot: 0 }, auth),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects negative unitCostSnapshot', async () => {
    const svc = createInventoryService(makeDb());
    await assert.rejects(
      () => svc.addTransaction({ warehouseId: 1, inventoryItemId: 1, transactionType: 'RECEIPT', quantity: 1, unitCostSnapshot: -1 }, auth),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects ISSUE when insufficient stock', async () => {
    // DB returns current stock of 2, but we try to issue 10
    const db = makeDb({
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql) => {
          if (sql.includes('FOR UPDATE')) return [[{ quantity_on_hand: '2.000' }], {}];
          if (sql.includes('warehouses')) return [[{ id: 1 }], {}];
          if (sql.includes('inventory_items')) return [[{ id: 1 }], {}];
          return [[], {}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      }),
      query: async (sql) => {
        if (sql.includes('warehouses')) return [[{ id: 1 }], {}];
        if (sql.includes('inventory_items')) return [[{ id: 1 }], {}];
        return [[], {}];
      }
    });

    const svc = createInventoryService(db);
    await assert.rejects(
      () => svc.addTransaction({ warehouseId: 1, inventoryItemId: 1, transactionType: 'ISSUE', quantity: 10, unitCostSnapshot: 50 }, auth),
      (err) => {
        assert.ok(err instanceof AppError);
        assert.equal(err.status, 409);
        assert.equal(err.code, 'INSUFFICIENT_STOCK');
        return true;
      }
    );
  });

  it('rejects ADJUSTMENT_OUT when insufficient stock', async () => {
    const db = makeDb({
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql) => {
          if (sql.includes('FOR UPDATE')) return [[{ quantity_on_hand: '0.000' }], {}];
          return [[], {}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      }),
      query: async (sql) => {
        if (sql.includes('warehouses')) return [[{ id: 1 }], {}];
        if (sql.includes('inventory_items')) return [[{ id: 1 }], {}];
        return [[], {}];
      }
    });

    const svc = createInventoryService(db);
    await assert.rejects(
      () => svc.addTransaction({ warehouseId: 1, inventoryItemId: 1, transactionType: 'ADJUSTMENT_OUT', quantity: 5, unitCostSnapshot: 0 }, auth),
      (err) => err instanceof AppError && err.status === 409 && err.code === 'INSUFFICIENT_STOCK'
    );
  });

  it('accepts valid RECEIPT transaction type', async () => {
    const db = makeDb({
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql) => {
          if (sql.includes('INSERT INTO inventory_transactions')) return [[{ insertId: 42 }], {}];
          return [[], {}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      }),
      query: async (sql) => {
        if (sql.includes('warehouses')) return [[{ id: 1 }], {}];
        if (sql.includes('inventory_items')) return [[{ id: 1 }], {}];
        return [[], {}];
      }
    });
    const svc = createInventoryService(db);
    const result = await svc.addTransaction(
      { warehouseId: 1, inventoryItemId: 1, transactionType: 'RECEIPT', quantity: 5, unitCostSnapshot: 100 },
      auth
    );
    assert.equal(result.transactionType, 'RECEIPT');
    assert.equal(result.quantity, 5);
  });
});

describe('updateItem validation', () => {
  it('rejects isActive non-boolean', async () => {
    const db = makeDb({
      query: async () => [[{ id: 1, standard_cost: 0, default_sale_price: 0, reorder_level: 0 }], {}]
    });
    const svc = createInventoryService(db);
    await assert.rejects(
      () => svc.updateItem(1, { isActive: 'yes' }),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects empty update body', async () => {
    const db = makeDb({
      query: async () => [[{ id: 1 }], {}]
    });
    const svc = createInventoryService(db);
    await assert.rejects(
      () => svc.updateItem(1, {}),
      (err) => err instanceof AppError && err.status === 422
    );
  });
});

describe('addPart validation', () => {
  const auth = { user: { id: 1 } };

  it('rejects when neither inventoryItemId nor description provided', async () => {
    const db = makeDb({
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async () => [[{ id: 1, branch_id: 1, repair_status: 'REPAIRING', parts_total: 0 }], {}],
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      })
    });
    const svc = createRepairPartsService(db);
    await assert.rejects(
      () => svc.addPart(1, {}, auth),
      (err) => err instanceof AppError && err.status === 422
    );
  });

  it('rejects adding part to non-active order status', async () => {
    const db = makeDb({
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql) => {
          if (sql.includes('repair_orders')) return [[{ id: 1, branch_id: 1, repair_status: 'DELIVERED', parts_total: 0 }], {}];
          return [[], {}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      }),
      query: async (sql) => {
        if (sql.includes('repair_orders')) return [[{ id: 1, branch_id: 1, repair_status: 'DELIVERED', parts_total: 0 }], {}];
        return [[], {}];
      }
    });
    const svc = createRepairPartsService(db);
    await assert.rejects(
      () => svc.addPart(1, { description: 'Manual part', quantity: 1 }, auth),
      (err) => err instanceof AppError && err.status === 409 && err.code === 'INVALID_ORDER_STATUS'
    );
  });

  it('rejects zero quantity when adding part', async () => {
    const db = makeDb({
      getConnection: async () => ({
        beginTransaction: async () => {},
        query: async (sql) => {
          if (sql.includes('repair_orders')) return [[{ id: 1, branch_id: 1, repair_status: 'REPAIRING', parts_total: 0 }], {}];
          return [[], {}];
        },
        commit: async () => {},
        rollback: async () => {},
        release: () => {}
      }),
      query: async (sql) => {
        if (sql.includes('repair_orders')) return [[{ id: 1, branch_id: 1, repair_status: 'REPAIRING', parts_total: 0 }], {}];
        return [[], {}];
      }
    });
    const svc = createRepairPartsService(db);
    await assert.rejects(
      () => svc.addPart(1, { description: 'A part', quantity: 0 }, auth),
      (err) => err instanceof AppError && err.status === 422
    );
  });
});
