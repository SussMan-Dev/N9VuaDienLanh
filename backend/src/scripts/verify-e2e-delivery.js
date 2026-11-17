/**
 * End-to-end integration verification for TASK-013.
 * Runs the complete lifecycle of a repair order from intake to delivery and warranty.
 * Run: node src/scripts/verify-e2e-delivery.js
 */
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { hashPassword } from '../lib/password.js';

const db = createPool(env.db);
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const password = `Pass-${suffix}-12345`;

let server;
let adminId, managerId, receptionId, techId;
let customerId, deviceId, orderId, warrantyClaimOrderId;
let itemId, warehouseId, quoteId, warrantyId, partId, paymentId;

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json(),
  };
}

function expect(cond, msg) {
  if (!cond) throw new Error(`ASSERTION FAILED: ${msg}`);
}

try {
  console.log(`Starting E2E Verification with suffix ${suffix}...`);

  // 1. Reference data
  const [[branch]] = await db.query('SELECT id FROM branches WHERE is_active=1 ORDER BY id LIMIT 1');
  const [roles] = await db.query("SELECT id, code FROM roles WHERE code IN ('ADMIN', 'MANAGER', 'RECEPTIONIST', 'TECHNICIAN')");
  const adminRole = roles.find((r) => r.code === 'ADMIN');
  const managerRole = roles.find((r) => r.code === 'MANAGER');
  const receptionRole = roles.find((r) => r.code === 'RECEPTIONIST');
  const techRole = roles.find((r) => r.code === 'TECHNICIAN');

  const pwHash = await hashPassword(password);
  async function makeUser(prefix, roleId) {
    const uname = `${prefix}-${suffix}`;
    const [res] = await db.query(
      'INSERT INTO users (branch_id, username, password_hash, full_name) VALUES (?, ?, ?, ?)',
      [branch.id, uname, pwHash, `E2E ${prefix}`]
    );
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [res.insertId, roleId]);
    return { id: res.insertId, username: uname };
  }

  const admin = await makeUser('adm', adminRole.id);
  adminId = admin.id;
  const manager = await makeUser('mgr', managerRole.id);
  managerId = manager.id;
  const reception = await makeUser('rec', receptionRole.id);
  receptionId = reception.id;
  const tech = await makeUser('tch', techRole.id);
  techId = tech.id;

  const app = createApp({ db });
  server = app.listen();
  const port = server.address().port;

  async function login(username) {
    const res = await request(port, '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    expect(res.status === 200, `Login failed for ${username}`);
    return { authorization: `Bearer ${res.body.token}`, 'content-type': 'application/json' };
  }

  const managerHeaders = await login(manager.username);
  const receptionHeaders = await login(reception.username);
  const techHeaders = await login(tech.username);

  // Get branch warehouse
  const [[wh]] = await db.query('SELECT id FROM warehouses WHERE branch_id = ? AND is_active = 1 LIMIT 1', [branch.id]);
  warehouseId = wh.id;

  // 2. Setup inventory item & initial stock
  const itemRes = await request(port, '/api/v1/inventory/items', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      sku: `E2E-PART-${suffix}`,
      name: `E2E Capacitor ${suffix}`,
      unit: 'cái',
      standardCost: 50000,
      defaultSalePrice: 120000,
      reorderLevel: 2,
    }),
  });
  expect(itemRes.status === 201, 'Create item failed');
  itemId = itemRes.body.id;

  await request(port, '/api/v1/inventory/transactions', {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      warehouseId,
      inventoryItemId: itemId,
      transactionType: 'RECEIPT',
      quantity: 10,
      unitCostSnapshot: 50000,
      notes: 'Initial stock for E2E',
    }),
  });

  // 3. Reception creates customer & device
  const custRes = await request(port, '/api/v1/customers', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      fullName: `Customer ${suffix}`,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      addressLine: '123 Test Street',
    }),
  });
  expect(custRes.status === 201, 'Create customer failed');
  customerId = custRes.body.id;

  const devRes = await request(port, '/api/v1/devices', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      customerId,
      deviceType: 'Laptop',
      brand: 'Dell',
      model: 'Inspiron 15',
      serialNumber: `SN-${suffix}`,
    }),
  });
  expect(devRes.status === 201, 'Create device failed');
  deviceId = devRes.body.id;

  // 4. Create repair order (Status = RECEIVED)
  const orderRes = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      deviceId,
      reportedIssue: 'Machine does not power on',
      intakeCondition: 'Minor scratches on cover',
      promisedAt: '2026-11-15',
    }),
  });
  expect(orderRes.status === 201, 'Create repair order failed');
  orderId = orderRes.body.id;
  expect(orderRes.body.repairStatus === 'RECEIVED', 'Order status should be RECEIVED');
  console.log('✓ Intake & Order creation OK (RECEIVED)');

  // 5. Manager assigns technician
  const asgRes = await request(port, `/api/v1/repair-orders/${orderId}/assignments`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      technicianUserId: techId,
      notes: 'Please check the power supply circuit',
    }),
  });
  expect(asgRes.status === 201, 'Assign technician failed');
  console.log('✓ Assignment OK');

  // 6. Technician advances to DIAGNOSING and adds diagnosis
  const diagTransRes = await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'DIAGNOSING' }),
  });
  expect(diagTransRes.status === 200, 'Transition to DIAGNOSING failed');

  const diagRes = await request(port, `/api/v1/repair-orders/${orderId}/diagnostics`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({
      diagnosisText: 'Faulty main power capacitor',
      recommendedAction: 'Replace capacitor and test voltage rail',
      estimatedLabor: 150000,
    }),
  });
  expect(diagRes.status === 201, 'Add diagnosis failed');
  console.log('✓ Diagnosis OK');

  // 7. Technician creates quote and transitions to WAITING_APPROVAL
  const quoteRes = await request(port, `/api/v1/repair-orders/${orderId}/quotes`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({
      items: [
        { itemType: 'LABOR', description: 'Công thay thế & đo kiểm', quantity: 1, unitPrice: 150000, discount: 0 },
        { itemType: 'PART', description: 'Tụ nguồn E2E', quantity: 1, unitPrice: 120000, discount: 0 },
      ],
      notes: 'Bảo hành 30 ngày',
    }),
  });
  expect(quoteRes.status === 201, 'Create quote failed');
  quoteId = quoteRes.body.id;
  expect(Number(quoteRes.body.totalAmount) === 270000, 'Quote total mismatch');

  await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'WAITING_APPROVAL' }),
  });
  console.log('✓ Quote creation OK (AWAITING_ADMIN_APPROVAL)');

  // 7b. Admin / Manager approves quote (Tier 1 Approval)
  const adminApprove = await request(port, `/api/v1/repair-orders/${orderId}/quotes/${quoteId}/admin-approval`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ decision: 'APPROVED', note: 'Manager duyệt mức giá' }),
  });
  expect(adminApprove.status === 200, 'Admin approval failed');

  // 8. Customer approves quote -> Order auto becomes APPROVED
  const decideRes = await request(port, `/api/v1/repair-orders/${orderId}/quotes/${quoteId}/decisions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({
      decision: 'APPROVED',
      customerContactName: `Customer ${suffix}`,
      note: 'Customer agreed via phone',
    }),
  });
  expect(decideRes.status === 200 && decideRes.body.status === 'APPROVED', 'Approve quote failed');

  // Transition repair order to APPROVED
  await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'APPROVED' }),
  });

  const approvedOrderRes = await request(port, `/api/v1/repair-orders/${orderId}`, { headers: techHeaders });
  expect(approvedOrderRes.body.repairStatus === 'APPROVED', 'Order should transition to APPROVED');
  console.log('✓ Quote approval OK (APPROVED)');

  // 9. Advance to REPAIRING and issue part from inventory
  await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'REPAIRING' }),
  });

  const partRes = await request(port, `/api/v1/repair-orders/${orderId}/parts`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({
      inventoryItemId: itemId,
      warehouseId,
      quantity: 1,
      unitPrice: 120000,
    }),
  });
  expect(partRes.status === 201, 'Add part failed');
  partId = partRes.body.id;

  // Verify stock was reduced from 10 to 9
  const stockRes = await request(port, `/api/v1/inventory/stocks/${warehouseId}/${itemId}`, { headers: managerHeaders });
  expect(stockRes.body.quantityOnHand === 9, 'Inventory stock should decrement to 9');
  console.log('✓ Repair & inventory issue OK (REPAIRING, stock=9)');

  // 10. Finish repair -> READY_FOR_PICKUP
  await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'READY_FOR_PICKUP' }),
  });

  // 11. Delivery blocked while unpaid
  const prematureDel = await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ toStatus: 'DELIVERED' }),
  });
  expect(prematureDel.status === 409, 'DELIVERED must be blocked when unpaid');
  console.log('✓ Delivery blocked on unpaid balance OK (409 OVERDUE_BALANCE)');

  // 12. Reception records full payment
  const billRes = await request(port, `/api/v1/repair-orders/${orderId}/billing`, { headers: receptionHeaders });
  const balanceDue = billRes.body.balance;
  expect(balanceDue > 0, 'Balance due must be positive');

  const payRes = await request(port, `/api/v1/repair-orders/${orderId}/payments`, {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      amount: balanceDue,
      paymentMethod: 'BANK_TRANSFER',
      notes: 'Paid in full via VietQR',
    }),
  });
  expect(payRes.status === 201, 'Payment failed');
  paymentId = payRes.body.id;

  const billAfterPay = await request(port, `/api/v1/repair-orders/${orderId}/billing`, { headers: receptionHeaders });
  expect(billAfterPay.body.balance === 0 && billAfterPay.body.paymentStatus === 'PAID', 'Order should be fully PAID');
  console.log('✓ Full payment recorded OK (PAID, balance=0)');

  // 13. Deliver machine to customer
  const delRes = await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ toStatus: 'DELIVERED' }),
  });
  expect(delRes.status === 200 && delRes.body.repairStatus === 'DELIVERED', 'Deliver machine failed');
  console.log('✓ Machine delivered to customer OK (DELIVERED)');

  // 14. Issue 30-day warranty
  const warrRes = await request(port, `/api/v1/repair-orders/${orderId}/warranties`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({
      startsAt: '2026-11-01',
      endsAt: '2026-12-01',
      terms: 'Bảo hành linh kiện tụ nguồn 30 ngày',
    }),
  });
  expect(warrRes.status === 201, 'Create warranty failed');
  warrantyId = warrRes.body.id;
  const wCode = warrRes.body.warrantyCode;

  // Verify lookup by warranty code
  const codeLookup = await request(port, `/api/v1/warranties/${wCode}`, { headers: receptionHeaders });
  expect(codeLookup.status === 200 && codeLookup.body.repairOrderId === orderId, 'Warranty code lookup failed');
  console.log(`✓ Warranty activated OK (${wCode})`);

  // 15. Customer returns under warranty -> Create claim order
  const claimOrderRes = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      deviceId,
      originalRepairOrderId: orderId,
      reportedIssue: 'Device intermittently loses power again',
      intakeCondition: 'No new damage',
    }),
  });
  expect(claimOrderRes.status === 201, 'Create claim order failed');
  warrantyClaimOrderId = claimOrderRes.body.id;

  const claimsList = await request(port, `/api/v1/repair-orders/${orderId}/warranty-claims`, { headers: receptionHeaders });
  expect(claimsList.body.items.some((c) => c.id === warrantyClaimOrderId), 'Claim not found in claims list');
  console.log('✓ Warranty claim order created & linked OK');

  // 16. Verify reports summary reflects all actions
  const repSummary = await request(port, '/api/v1/reports/summary', { headers: managerHeaders });
  expect(repSummary.status === 200, 'Report summary failed');
  expect(repSummary.body.financials.totalCollected >= balanceDue, 'Report collected total mismatch');
  expect(repSummary.body.warranty.totalWarranties >= 1, 'Report warranties mismatch');
  expect(repSummary.body.warranty.totalClaims >= 1, 'Report claims mismatch');
  console.log('✓ Reports summary aggregates OK');

  console.log('\n🎉 ALL END-TO-END BUSINESS FLOWS VERIFIED SUCCESSFULLY!');
} finally {
  if (server) await new Promise((res) => server.close(res));

  // Cleanup in reverse dependency order
  if (warrantyClaimOrderId) {
    await db.query('DELETE FROM repair_status_history WHERE repair_order_id = ?', [warrantyClaimOrderId]);
    await db.query('DELETE FROM repair_orders WHERE id = ?', [warrantyClaimOrderId]);
  }
  if (warrantyId) {
    await db.query('DELETE FROM warranties WHERE id = ?', [warrantyId]);
  }
  if (paymentId) {
    await db.query('DELETE FROM payments WHERE id = ?', [paymentId]);
  }
  if (partId) {
    await db.query('DELETE FROM repair_order_parts WHERE id = ?', [partId]);
  }
  if (orderId) {
    await db.query('DELETE FROM quote_decision_history WHERE quote_id IN (SELECT id FROM quotes WHERE repair_order_id = ?)', [orderId]);
    await db.query('DELETE FROM quote_items WHERE quote_id IN (SELECT id FROM quotes WHERE repair_order_id = ?)', [orderId]);
    await db.query('DELETE FROM quotes WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM diagnostics WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM repair_assignments WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM repair_status_history WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM inventory_transactions WHERE repair_order_id = ?', [orderId]);
    await db.query('DELETE FROM repair_orders WHERE id = ?', [orderId]);
  }
  if (deviceId) {
    await db.query('DELETE FROM devices WHERE id = ?', [deviceId]);
  }
  if (customerId) {
    await db.query('DELETE FROM customers WHERE id = ?', [customerId]);
  }
  if (itemId) {
    await db.query('DELETE FROM inventory_transactions WHERE inventory_item_id = ?', [itemId]);
    await db.query('DELETE FROM inventory_stocks WHERE inventory_item_id = ?', [itemId]);
    await db.query('DELETE FROM inventory_items WHERE id = ?', [itemId]);
  }
  const uIds = [adminId, managerId, receptionId, techId].filter(Boolean);
  if (uIds.length) {
    await db.query(`DELETE FROM auth_sessions WHERE user_id IN (${uIds.map(() => '?').join(',')})`, uIds);
    await db.query(`DELETE FROM user_roles WHERE user_id IN (${uIds.map(() => '?').join(',')})`, uIds);
    await db.query(`DELETE FROM users WHERE id IN (${uIds.map(() => '?').join(',')})`, uIds);
  }

  await db.end();
}
