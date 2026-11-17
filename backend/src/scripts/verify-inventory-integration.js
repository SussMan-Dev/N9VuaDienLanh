/**
 * Integration test for TASK-008: Inventory & repair items.
 * Creates temporary data, runs assertions, cleans up — all on the real DB.
 * Run: node src/scripts/verify-inventory-integration.js
 */
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { hashPassword } from '../lib/password.js';

const db = createPool(env.db);
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const password = `Inv-${suffix}-pass`;

let server;
let adminId, managerId, techId, customerId, deviceId;
let orderId, itemId, warehouseId;
const partIds = [];
const txIds = [];

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json()
  };
}

function expect(condition, message) {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

try {
  // ── Seed users ──────────────────────────────────────────────────────────────
  const [[branch]] = await db.query('SELECT id FROM branches WHERE is_active = 1 ORDER BY id LIMIT 1');
  const [roles] = await db.query("SELECT id, code FROM roles WHERE code IN ('ADMIN', 'MANAGER', 'RECEPTIONIST', 'TECHNICIAN')");
  const adminRole = roles.find((r) => r.code === 'ADMIN');
  const managerRole = roles.find((r) => r.code === 'MANAGER');
  const receptionRole = roles.find((r) => r.code === 'RECEPTIONIST');
  const techRole = roles.find((r) => r.code === 'TECHNICIAN');
  expect(branch && adminRole && managerRole && receptionRole && techRole, 'Required reference data missing');

  const passwordHash = await hashPassword(password);

  async function createUser(prefix, roleId) {
    const username = `${prefix}-${suffix}`;
    const [res] = await db.query(
      'INSERT INTO users (branch_id, username, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [branch.id, username, passwordHash, `User ${prefix}`]
    );
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [res.insertId, roleId]);
    return { id: res.insertId, username };
  }

  const admin = await createUser('inv-admin', adminRole.id);
  adminId = admin.id;
  const manager = await createUser('inv-mgr', managerRole.id);
  managerId = manager.id;
  const reception = await createUser('inv-rec', receptionRole.id);
  const tech = await createUser('inv-tech', techRole.id);
  techId = tech.id;

  const app = createApp({ db });
  server = app.listen();
  const port = server.address().port;

  async function login(username) {
    const res = await request(port, '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    expect(res.status === 200, `Login failed for ${username}: ${res.status}`);
    return { authorization: `Bearer ${res.body.token}`, 'content-type': 'application/json' };
  }

  const adminHeaders = await login(admin.username);
  const managerHeaders = await login(manager.username);
  const receptionHeaders = await login(reception.username);
  const techHeaders = await login(tech.username);

  // ── Get warehouse for the branch ────────────────────────────────────────────
  const [[wh]] = await db.query('SELECT id FROM warehouses WHERE branch_id = ? AND is_active = 1 ORDER BY id LIMIT 1', [branch.id]);
  expect(wh, 'No active warehouse found for the branch — check seed data');
  warehouseId = wh.id;
  console.log(`Using branch=${branch.id} warehouse=${warehouseId}`);

  // ── 1. Create inventory item ─────────────────────────────────────────────────
  const itemRes = await request(port, '/api/v1/inventory/items', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      sku: `TEST-${suffix}`,
      name: `Test Capacitor ${suffix}`,
      unit: 'piece',
      standardCost: 80000,
      defaultSalePrice: 150000,
      reorderLevel: 5
    })
  });
  expect(itemRes.status === 201, `Create item failed: ${itemRes.status} ${JSON.stringify(itemRes.body)}`);
  itemId = itemRes.body.id;
  expect(itemRes.body.sku === `TEST-${suffix}`, 'Item SKU mismatch');
  expect(Number(itemRes.body.standardCost) === 80000, 'standardCost mismatch');
  console.log('✓ Create item OK');

  // ── 2. Reject duplicate SKU ──────────────────────────────────────────────────
  const dupSku = await request(port, '/api/v1/inventory/items', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ sku: `TEST-${suffix}`, name: 'Duplicate', unit: 'piece' })
  });
  expect(dupSku.status === 409, `Duplicate SKU should be 409: got ${dupSku.status}`);
  console.log('✓ Duplicate SKU rejected OK');

  // ── 3. Technician cannot create item (no inventory.manage) ──────────────────
  const techCreate = await request(port, '/api/v1/inventory/items', {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ sku: `TECH-${suffix}`, name: 'Unauthorized', unit: 'piece' })
  });
  expect(techCreate.status === 403, `Technician should be forbidden: got ${techCreate.status}`);
  console.log('✓ Technician forbidden from creating item OK');

  // ── 4. Receipt (RECEIPT) — stock increases ───────────────────────────────────
  const receiptRes = await request(port, '/api/v1/inventory/transactions', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      warehouseId,
      inventoryItemId: itemId,
      transactionType: 'RECEIPT',
      quantity: 20,
      unitCostSnapshot: 80000,
      note: 'Initial stock receipt'
    })
  });
  expect(receiptRes.status === 201, `RECEIPT failed: ${receiptRes.status} ${JSON.stringify(receiptRes.body)}`);
  txIds.push(receiptRes.body.id);
  console.log('✓ RECEIPT transaction OK');

  // Check stock increased
  const stockRes = await request(port, `/api/v1/inventory/stocks/${warehouseId}/${itemId}`, { headers: managerHeaders });
  expect(stockRes.status === 200, `Get stock failed: ${stockRes.status}`);
  expect(Number(stockRes.body.quantityOnHand) === 20, `Expected 20 on hand, got ${stockRes.body.quantityOnHand}`);
  console.log('✓ Stock after RECEIPT = 20 OK');

  // ── 5. Issue (ISSUE) with enough stock → OK ──────────────────────────────────
  const issueOkRes = await request(port, '/api/v1/inventory/transactions', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      warehouseId,
      inventoryItemId: itemId,
      transactionType: 'ISSUE',
      quantity: 5,
      unitCostSnapshot: 80000,
      note: 'Manual issue'
    })
  });
  expect(issueOkRes.status === 201, `ISSUE with stock OK failed: ${issueOkRes.status} ${JSON.stringify(issueOkRes.body)}`);
  txIds.push(issueOkRes.body.id);
  console.log('✓ ISSUE with sufficient stock OK');

  // Stock should now be 15
  const stock2 = await request(port, `/api/v1/inventory/stocks/${warehouseId}/${itemId}`, { headers: managerHeaders });
  expect(Number(stock2.body.quantityOnHand) === 15, `Expected 15 on hand, got ${stock2.body.quantityOnHand}`);
  console.log('✓ Stock after ISSUE = 15 OK');

  // ── 6. Issue exceeding stock → 409 ──────────────────────────────────────────
  const issueFailRes = await request(port, '/api/v1/inventory/transactions', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      warehouseId,
      inventoryItemId: itemId,
      transactionType: 'ISSUE',
      quantity: 100,
      unitCostSnapshot: 80000
    })
  });
  expect(issueFailRes.status === 409, `Over-issue should be 409: got ${issueFailRes.status}`);
  expect(issueFailRes.body.error?.code === 'INSUFFICIENT_STOCK', 'Expected INSUFFICIENT_STOCK code');
  console.log('✓ ISSUE exceeding stock → 409 OK');

  // Stock must remain 15 after failed issue
  const stock3 = await request(port, `/api/v1/inventory/stocks/${warehouseId}/${itemId}`, { headers: managerHeaders });
  expect(Number(stock3.body.quantityOnHand) === 15, `Expected 15 on hand after failed issue, got ${stock3.body.quantityOnHand}`);
  console.log('✓ Stock unchanged after failed ISSUE OK');

  // ── 7. ADJUSTMENT_OUT exceeding stock → 409 ─────────────────────────────────
  const adjFailRes = await request(port, '/api/v1/inventory/transactions', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      warehouseId,
      inventoryItemId: itemId,
      transactionType: 'ADJUSTMENT_OUT',
      quantity: 999,
      unitCostSnapshot: 0
    })
  });
  expect(adjFailRes.status === 409, `ADJUSTMENT_OUT exceeding stock should be 409: got ${adjFailRes.status}`);
  console.log('✓ ADJUSTMENT_OUT exceeding stock → 409 OK');

  // ── 8. Get item with totalOnHand ─────────────────────────────────────────────
  const itemDetail = await request(port, `/api/v1/inventory/items/${itemId}`, { headers: managerHeaders });
  expect(itemDetail.status === 200, `Get item failed: ${itemDetail.status}`);
  expect(Number(itemDetail.body.totalOnHand) === 15, `Expected totalOnHand 15, got ${itemDetail.body.totalOnHand}`);
  console.log('✓ Get item with totalOnHand OK');

  // ── 9. Update item (PATCH) ───────────────────────────────────────────────────
  const patchRes = await request(port, `/api/v1/inventory/items/${itemId}`, {
    method: 'PATCH',
    headers: managerHeaders,
    body: JSON.stringify({ defaultSalePrice: 180000, reorderLevel: 3 })
  });
  expect(patchRes.status === 200, `PATCH item failed: ${patchRes.status}`);
  expect(Number(patchRes.body.defaultSalePrice) === 180000, 'defaultSalePrice not updated');
  console.log('✓ PATCH item OK');

  // ── 10. Create customer, device, repair order ────────────────────────────────
  const custRes = await request(port, '/api/v1/customers', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ fullName: `Inv Test Customer ${suffix}`, phone: '0988333444' })
  });
  expect(custRes.status === 201, `Customer creation failed: ${custRes.status}`);
  customerId = custRes.body.id;

  const devRes = await request(port, '/api/v1/devices', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ customerId, brand: 'Daikin', model: 'Inv-Test' })
  });
  expect(devRes.status === 201, `Device creation failed: ${devRes.status}`);
  deviceId = devRes.body.id;

  const roRes = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ deviceId, reportedIssue: 'Inventory test order' })
  });
  expect(roRes.status === 201, `RO creation failed: ${roRes.status}`);
  orderId = roRes.body.id;

  // ── 11. Advance order to REPAIRING ─────────────────────────────────────────
  // Assign tech
  await request(port, `/api/v1/repair-orders/${orderId}/assignments`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ technicianUserId: techId })
  });
  // RECEIVED → DIAGNOSING
  await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'DIAGNOSING' })
  });
  // Create diagnostic
  await request(port, `/api/v1/repair-orders/${orderId}/diagnostics`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ diagnosisText: 'Test', estimatedLabor: 50000 })
  });
  // Quote
  const q = await request(port, `/api/v1/repair-orders/${orderId}/quotes`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ laborAmount: 50000 })
  });
  // Admin approves quote (Tier 1)
  await request(port, `/api/v1/repair-orders/${orderId}/quotes/${q.body.id}/admin-approval`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ decision: 'APPROVED' })
  });
  // Customer approves quote (Tier 2) -> Order auto transitions to APPROVED
  await request(port, `/api/v1/repair-orders/${orderId}/quotes/${q.body.id}/decisions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ decision: 'APPROVED', customerContactName: 'Tester' })
  });
  // APPROVED → REPAIRING
  const repairingRes = await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'REPAIRING' })
  });
  expect(repairingRes.status === 200 && repairingRes.body.repairStatus === 'REPAIRING', `Failed to reach REPAIRING: ${repairingRes.status}`);
  console.log('✓ Order advanced to REPAIRING OK');

  // ── 12. Add part (with inventory item) → auto ISSUE stock ──────────────────
  const addPartRes = await request(port, `/api/v1/repair-orders/${orderId}/parts`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ inventoryItemId: itemId, quantity: 3 })
  });
  expect(addPartRes.status === 201, `Add part failed: ${addPartRes.status} ${JSON.stringify(addPartRes.body)}`);
  const part1Id = addPartRes.body.id;
  partIds.push(part1Id);
  expect(addPartRes.body.inventoryTransactionId !== null, 'inventoryTransactionId should be set');
  console.log('✓ Add part with auto ISSUE OK');

  // Stock should now be 12 (15 - 3)
  const stock4 = await request(port, `/api/v1/inventory/stocks/${warehouseId}/${itemId}`, { headers: managerHeaders });
  expect(Number(stock4.body.quantityOnHand) === 12, `Expected 12 on hand after part add, got ${stock4.body.quantityOnHand}`);
  console.log('✓ Stock after addPart = 12 OK');

  // Check parts_total updated
  const roAfterPart = await request(port, `/api/v1/repair-orders/${orderId}`, { headers: techHeaders });
  const expectedLineTotal = 3 * 180000; // 3 * updated defaultSalePrice
  expect(Number(roAfterPart.body.partsTotal) === expectedLineTotal, `partsTotal expected ${expectedLineTotal}, got ${roAfterPart.body.partsTotal}`);
  console.log('✓ parts_total updated after addPart OK');

  // ── 13. List parts ──────────────────────────────────────────────────────────
  const listPartsRes = await request(port, `/api/v1/repair-orders/${orderId}/parts`, { headers: techHeaders });
  expect(listPartsRes.status === 200, `List parts failed: ${listPartsRes.status}`);
  expect(listPartsRes.body.items.length === 1, `Expected 1 part, got ${listPartsRes.body.items.length}`);
  console.log('✓ List parts OK');

  // ── 14. Add manual part (no inventory item) ─────────────────────────────────
  const manualPartRes = await request(port, `/api/v1/repair-orders/${orderId}/parts`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ description: 'Custom adhesive tape', quantity: 2, unitPriceSnapshot: 5000 })
  });
  expect(manualPartRes.status === 201, `Manual part failed: ${manualPartRes.status} ${JSON.stringify(manualPartRes.body)}`);
  expect(manualPartRes.body.inventoryTransactionId === null, 'Manual part should have no txId');
  partIds.push(manualPartRes.body.id);
  console.log('✓ Manual part (no inventory) OK');

  // ── 15. Cannot add part to DELIVERED order ──────────────────────────────────
  // Transition to READY_FOR_PICKUP then DELIVERED for a different check
  // Instead, try on a RECEIVED order (we only have orderId as REPAIRING)
  // Let's just verify 409 logic via invalid status:
  // Create another quick order and try to add part immediately (status RECEIVED)
  const ro2 = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ deviceId, reportedIssue: 'Test 2' })
  });
  expect(ro2.status === 201, `RO2 creation failed: ${ro2.status}`);
  const order2Id = ro2.body.id;

  const badPartRes = await request(port, `/api/v1/repair-orders/${order2Id}/parts`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ description: 'Should fail', quantity: 1 })
  });
  expect(badPartRes.status === 409, `Expected 409 for RECEIVED order, got ${badPartRes.status}`);
  expect(badPartRes.body.error?.code === 'INVALID_ORDER_STATUS', `Expected INVALID_ORDER_STATUS, got ${badPartRes.body.error?.code}`);
  console.log('✓ Cannot add part to non-active order OK');

  // Clean up RO2 quickly
  await db.query('DELETE FROM repair_status_history WHERE repair_order_id = ?', [order2Id]);
  await db.query('DELETE FROM repair_orders WHERE id = ?', [order2Id]);

  // ── 16. Remove part → stock returned ────────────────────────────────────────
  const removePartRes = await request(port, `/api/v1/repair-orders/${orderId}/parts/${part1Id}`, {
    method: 'DELETE',
    headers: techHeaders
  });
  expect(removePartRes.status === 200, `Remove part failed: ${removePartRes.status} ${JSON.stringify(removePartRes.body)}`);
  console.log('✓ Remove part OK');

  // Stock should be back to 12 + 3 = 15
  const stock5 = await request(port, `/api/v1/inventory/stocks/${warehouseId}/${itemId}`, { headers: managerHeaders });
  expect(Number(stock5.body.quantityOnHand) === 15, `Expected 15 on hand after remove, got ${stock5.body.quantityOnHand}`);
  console.log('✓ Stock returned after removePart = 15 OK');

  // parts_total should be reduced
  const roAfterRemove = await request(port, `/api/v1/repair-orders/${orderId}`, { headers: techHeaders });
  // Only manual part remains: 2 * 5000 = 10000
  expect(Number(roAfterRemove.body.partsTotal) === 10000, `parts_total expected 10000 after remove, got ${roAfterRemove.body.partsTotal}`);
  console.log('✓ parts_total reduced after removePart OK');

  // ── 17. Transaction list filtering ──────────────────────────────────────────
  const txListRes = await request(port, `/api/v1/inventory/transactions?itemId=${itemId}`, { headers: managerHeaders });
  expect(txListRes.status === 200, `Transaction list failed: ${txListRes.status}`);
  // We have: RECEIPT(20) + ISSUE(5) + ISSUE(3 via part) + RETURN(3 via removePart) = 4 transactions at minimum
  expect(txListRes.body.items.length >= 4, `Expected >= 4 transactions, got ${txListRes.body.items.length}`);
  console.log(`✓ Transaction list (${txListRes.body.items.length} items) OK`);

  // ── 18. Low stock filter ────────────────────────────────────────────────────
  // reorderLevel = 3, current = 15 → NOT low
  const notLow = await request(port, `/api/v1/inventory/stocks?lowStock=true`, { headers: managerHeaders });
  expect(notLow.status === 200, `Low stock list failed: ${notLow.status}`);
  const ourItemInLow = notLow.body.items.find((s) => s.itemId === itemId);
  expect(!ourItemInLow, 'Item should NOT appear in low stock when qty=15 > reorderLevel=3');
  console.log('✓ Low stock filter (our item not low) OK');

  // ── 19. Invalid transaction type rejected ────────────────────────────────────
  const badType = await request(port, '/api/v1/inventory/transactions', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ warehouseId, inventoryItemId: itemId, transactionType: 'IN', quantity: 1, unitCostSnapshot: 0 })
  });
  expect(badType.status === 422, `Bad type should be 422: got ${badType.status}`);
  console.log('✓ Invalid transactionType → 422 OK');

  console.log('\n✅ All inventory integration tests PASSED!');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));

  // ── Cleanup in reverse FK order ─────────────────────────────────────────────
  if (orderId) {
    // Delete remaining parts (RETURN tx auto-linked)
    const [remainingParts] = await db.query('SELECT id, inventory_transaction_id FROM repair_order_parts WHERE repair_order_id = ?', [orderId]);
    for (const p of remainingParts) {
      if (p.inventory_transaction_id) {
        // Undo the RETURN transactions inserted
        await db.query('DELETE FROM inventory_transactions WHERE id = ?', [p.inventory_transaction_id]);
      }
    }
    await db.query('DELETE FROM repair_order_parts WHERE repair_order_id = ?', [orderId]);

    // Delete inventory transactions linked to this order
    await db.query('DELETE FROM inventory_transactions WHERE repair_order_id = ?', [orderId]);

    // Quotes
    const [quoteRows] = await db.query('SELECT id FROM quotes WHERE repair_order_id = ?', [orderId]);
    for (const q of quoteRows) {
      await db.query('DELETE FROM quote_decision_history WHERE quote_id = ?', [q.id]);
      await db.query('DELETE FROM quote_items WHERE quote_id = ?', [q.id]);
    }
    await db.query('DELETE FROM quotes WHERE repair_order_id = ?', [orderId]);

    await db.query('DELETE FROM diagnostics WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM repair_assignments WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM repair_status_history WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM repair_orders WHERE id = ?', [orderId]);
  }

  // Delete manual inventory transactions (not linked to order)
  if (txIds.length) {
    const ph = txIds.map(() => '?').join(',');
    await db.query(`DELETE FROM inventory_transactions WHERE id IN (${ph})`, txIds);
  }

  // Delete stock record (if stock was added, reset it; simplest is to delete the row)
  if (itemId && warehouseId) {
    await db.query('DELETE FROM inventory_stocks WHERE inventory_item_id = ? AND warehouse_id = ?', [itemId, warehouseId]);
  }

  if (itemId) await db.query('DELETE FROM inventory_items WHERE id = ?', [itemId]);
  if (deviceId) await db.query('DELETE FROM devices WHERE id = ?', [deviceId]);
  if (customerId) await db.query('DELETE FROM customers WHERE id = ?', [customerId]);

  const userIds = [adminId, managerId, techId].filter(Boolean);
  if (userIds.length) {
    const ph = userIds.map(() => '?').join(',');
    await db.query(`DELETE FROM auth_sessions WHERE user_id IN (${ph})`, userIds);
    await db.query(`DELETE FROM user_roles WHERE user_id IN (${ph})`, userIds);
    await db.query(`DELETE FROM users WHERE id IN (${ph})`, userIds);
  }

  await db.end();
}
