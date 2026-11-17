import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { hashPassword } from '../lib/password.js';

const db = createPool(env.db);
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const password = `Billing-${suffix}-pass`;

let server;
let adminId;
let managerId;
let receptionId;
let techId;
let customerId;
let deviceId;
let order1Id;
let order2Id;

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  return {
    status: response.status,
    body: response.status === 204 ? null : await response.json()
  };
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

try {
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

  const admin = await createUser('admin', adminRole.id);
  adminId = admin.id;
  const manager = await createUser('mgr', managerRole.id);
  managerId = manager.id;
  const reception = await createUser('rec', receptionRole.id);
  receptionId = reception.id;
  const tech = await createUser('tech', techRole.id);
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

  const managerHeaders = await login(manager.username);
  const receptionHeaders = await login(reception.username);
  const techHeaders = await login(tech.username);

  // 1. Setup Customer, Device and Order 1
  const custRes = await request(port, '/api/v1/customers', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ fullName: `Billing Customer ${suffix}`, phone: '0977112233' })
  });
  expect(custRes.status === 201, `Customer creation failed: ${custRes.status}`);
  customerId = custRes.body.id;

  const devRes = await request(port, '/api/v1/devices', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ customerId, brand: 'Toshiba', model: 'Inverter 10kg' })
  });
  expect(devRes.status === 201, `Device creation failed: ${devRes.status}`);
  deviceId = devRes.body.id;

  const ro1Res = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ deviceId, reportedIssue: 'Motor vibrates heavily' })
  });
  expect(ro1Res.status === 201, `RO1 creation failed: ${ro1Res.status}`);
  order1Id = ro1Res.body.id;

  // 2. Assign technician, advance workflow and approve quote
  await request(port, `/api/v1/repair-orders/${order1Id}/assignments`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ technicianUserId: techId })
  });

  await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'DIAGNOSING' })
  });

  const quoteRes = await request(port, `/api/v1/repair-orders/${order1Id}/quotes`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({
      items: [
        { itemType: 'LABOR', description: 'Motor replacement labor', quantity: 1, unitPrice: 200000 },
        { itemType: 'PART', description: 'Motor belt and shock absorber', quantity: 1, unitPrice: 300000 }
      ],
      taxAmount: 50000
    })
  });
  expect(quoteRes.status === 201, `Quote creation failed: ${quoteRes.status}`);
  const quoteId = quoteRes.body.id;

  const adminApprove = await request(port, `/api/v1/repair-orders/${order1Id}/quotes/${quoteId}/admin-approval`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ decision: 'APPROVED' })
  });
  expect(adminApprove.status === 200, `Admin quote approve failed: ${adminApprove.status}`);

  const approveRes = await request(port, `/api/v1/repair-orders/${order1Id}/quotes/${quoteId}/decisions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ decision: 'APPROVED', customerContactName: 'Customer A' })
  });
  expect(approveRes.status === 200, `Quote approve failed: ${approveRes.status}`);

  // 3. Billing Summary Check
  const billSummary1 = await request(port, `/api/v1/repair-orders/${order1Id}/billing`, { headers: receptionHeaders });
  expect(billSummary1.status === 200, 'Billing summary failed');
  expect(billSummary1.body.totalReceivable === 550000, `Expected receivable 550000, got ${billSummary1.body.totalReceivable}`);
  expect(billSummary1.body.totalPaid === 0, `Expected paid 0, got ${billSummary1.body.totalPaid}`);
  expect(billSummary1.body.balance === 550000, `Expected balance 550000, got ${billSummary1.body.balance}`);
  expect(billSummary1.body.paymentStatus === 'UNPAID', 'Expected UNPAID');

  // 4. First Payment (Partial payment)
  const pay1Res = await request(port, `/api/v1/repair-orders/${order1Id}/payments`, {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      amount: 200000,
      paymentMethod: 'CASH',
      note: 'Deposit payment'
    })
  });
  expect(pay1Res.status === 201, `Payment 1 failed: ${pay1Res.status}`);
  expect(pay1Res.body.receiptNumber.startsWith('REC-'), 'Receipt number format invalid');
  expect(pay1Res.body.billing.balance === 350000, `Expected balance 350000, got ${pay1Res.body.billing.balance}`);
  expect(pay1Res.body.billing.paymentStatus === 'PARTIALLY_PAID', 'Expected PARTIALLY_PAID');

  // 5. Overpayment & Void Payment verification
  // Receptionist attempts payment of 400000 (exceeds balance 350000) without manager approval
  const overpayFail = await request(port, `/api/v1/repair-orders/${order1Id}/payments`, {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      amount: 400000,
      paymentMethod: 'CASH'
    })
  });
  expect(overpayFail.status === 409, `Overpayment should be 409: got ${overpayFail.status}`);

  // Manager overpays with note
  const overpayOk = await request(port, `/api/v1/repair-orders/${order1Id}/payments`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({
      amount: 400000,
      paymentMethod: 'CASH',
      note: 'Customer tipped or advance for future service'
    })
  });
  expect(overpayOk.status === 201, `Manager overpayment failed: ${overpayOk.status}`);
  const overpayPaymentId = overpayOk.body.id;

  // Receptionist cannot void payment
  const voidForbidden = await request(port, `/api/v1/repair-orders/${order1Id}/payments/${overpayPaymentId}/void`, {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ reason: 'Mistake' })
  });
  expect(voidForbidden.status === 403, `Receptionist void should be 403: got ${voidForbidden.status}`);

  // Manager voids the overpayment
  const voidOk = await request(port, `/api/v1/repair-orders/${order1Id}/payments/${overpayPaymentId}/void`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ reason: 'Customer requested refund of extra amount' })
  });
  expect(voidOk.status === 200 && voidOk.body.status === 'VOIDED', `Manager void failed: ${voidOk.status}`);
  expect(voidOk.body.billing.balance === 350000, `Balance after void should be 350000, got ${voidOk.body.billing.balance}`);

  // 6. State Machine transition to DELIVERED requires zero balance (Rule 4)
  await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'APPROVED' })
  });

  await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'REPAIRING' })
  });

  await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'READY_FOR_PICKUP' })
  });

  // Attempting to deliver with remaining balance 350000 must fail with 409
  const deliverUnpaidFail = await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'DELIVERED' })
  });
  expect(deliverUnpaidFail.status === 409 && deliverUnpaidFail.body.error?.code === 'OUTSTANDING_BALANCE_REMAINING', `Delivery with balance should be 409 OUTSTANDING_BALANCE_REMAINING: got ${deliverUnpaidFail.status}`);

  // Pay remaining 350000
  const pay2Res = await request(port, `/api/v1/repair-orders/${order1Id}/payments`, {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      amount: 350000,
      paymentMethod: 'BANK_TRANSFER',
      referenceCode: 'FT-998822'
    })
  });
  expect(pay2Res.status === 201 && pay2Res.body.billing.balance === 0, 'Final payment failed');
  expect(pay2Res.body.billing.paymentStatus === 'PAID', 'Payment status should be PAID');

  // Now delivery succeeds!
  const deliverOk = await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ toStatus: 'DELIVERED' })
  });
  expect(deliverOk.status === 200 && deliverOk.body.repairStatus === 'DELIVERED', `Delivery failed: ${deliverOk.status}`);

  // 7. Warranties
  const warrantyFail = await request(port, `/api/v1/repair-orders/${order1Id}/warranties`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({ startsAt: '2026-11-01', endsAt: '2026-10-01' })
  });
  expect(warrantyFail.status === 422, `Invalid warranty date should return 422: got ${warrantyFail.status}`);

  const warrantyRes = await request(port, `/api/v1/repair-orders/${order1Id}/warranties`, {
    method: 'POST',
    headers: techHeaders,
    body: JSON.stringify({
      startsAt: '2026-10-30',
      endsAt: '2027-01-30',
      terms: '3 months warranty on replaced motor belt and labor'
    })
  });
  expect(warrantyRes.status === 201, `Warranty creation failed: ${warrantyRes.status}`);
  const warrantyCode = warrantyRes.body.warrantyCode;

  // Lookup warranty by code
  const lookupWarranty = await request(port, `/api/v1/warranties/${warrantyCode}`, { headers: receptionHeaders });
  expect(lookupWarranty.status === 200 && lookupWarranty.body.warrantyCode === warrantyCode, 'Lookup warranty failed');
  expect(lookupWarranty.body.customerName.includes('Billing Customer'), 'Warranty customer mismatch');
  expect(lookupWarranty.body.deviceBrand === 'Toshiba', 'Warranty device mismatch');

  // 8. Warranty Claim / Re-repair Order (linked to original order)
  const reRepairRes = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({
      deviceId,
      originalRepairOrderId: order1Id,
      reportedIssue: 'Belt slipped under heavy load during warranty period'
    })
  });
  expect(reRepairRes.status === 201, `Warranty claim order creation failed: ${reRepairRes.status}`);
  order2Id = reRepairRes.body.id;
  expect(reRepairRes.body.originalRepairOrderId === order1Id, 'Original repair order ID not linked');
  expect(reRepairRes.body.originalRepairOrderCode === ro1Res.body.code, 'Original repair order code not linked');

  // Verify RO1 claims list
  const claimsList = await request(port, `/api/v1/repair-orders/${order1Id}/warranty-claims`, { headers: receptionHeaders });
  expect(claimsList.status === 200 && claimsList.body.items.length === 1, 'Claims list failed');
  expect(claimsList.body.items[0].id === order2Id, 'Claim order ID mismatch');

  console.log('✅ Billing, payments, receivables, and warranty integration verification PASSED!');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));

  const orderIds = [order1Id, order2Id].filter(Boolean);
  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
    await db.query(`DELETE FROM warranties WHERE repair_order_id IN (${placeholders})`, orderIds);
    await db.query(`DELETE FROM payments WHERE repair_order_id IN (${placeholders})`, orderIds);
    await db.query(`DELETE FROM repair_order_parts WHERE repair_order_id IN (${placeholders})`, orderIds);

    const [quoteRows] = await db.query(`SELECT id FROM quotes WHERE repair_order_id IN (${placeholders})`, orderIds);
    const quoteIds = quoteRows.map((q) => q.id);
    if (quoteIds.length) {
      const qPlaceholders = quoteIds.map(() => '?').join(',');
      await db.query(`DELETE FROM quote_decision_history WHERE quote_id IN (${qPlaceholders})`, quoteIds);
      await db.query(`DELETE FROM quote_items WHERE quote_id IN (${qPlaceholders})`, quoteIds);
      await db.query(`DELETE FROM quotes WHERE id IN (${qPlaceholders})`, quoteIds);
    }

    await db.query(`DELETE FROM diagnostics WHERE repair_order_id IN (${placeholders})`, orderIds);
    await db.query(`DELETE FROM repair_assignments WHERE repair_order_id IN (${placeholders})`, orderIds);
    await db.query(`DELETE FROM repair_status_history WHERE repair_order_id IN (${placeholders})`, orderIds);

    // Delete child orders first if any self-referencing foreign key
    if (order2Id) await db.query('DELETE FROM repair_orders WHERE id = ?', [order2Id]);
    if (order1Id) await db.query('DELETE FROM repair_orders WHERE id = ?', [order1Id]);
  }

  if (deviceId) await db.query('DELETE FROM devices WHERE id = ?', [deviceId]);
  if (customerId) await db.query('DELETE FROM customers WHERE id = ?', [customerId]);

  const userIds = [adminId, managerId, receptionId, techId].filter(Boolean);
  if (userIds.length) {
    const uPlaceholders = userIds.map(() => '?').join(',');
    await db.query(`DELETE FROM auth_sessions WHERE user_id IN (${uPlaceholders})`, userIds);
    await db.query(`DELETE FROM user_roles WHERE user_id IN (${uPlaceholders})`, userIds);
    await db.query(`DELETE FROM users WHERE id IN (${uPlaceholders})`, userIds);
  }

  await db.end();
}
