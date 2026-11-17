import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { hashPassword } from '../lib/password.js';

const db = createPool(env.db);
const suffix = randomUUID().replaceAll('-', '').slice(0, 10);
const password = `Workflow-${suffix}-pass`;

let server;
let adminId;
let managerId;
let receptionId;
let tech1Id;
let tech2Id;
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
  const tech1 = await createUser('tech1', techRole.id);
  tech1Id = tech1.id;
  const tech2 = await createUser('tech2', techRole.id);
  tech2Id = tech2.id;

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
  const tech1Headers = await login(tech1.username);
  const tech2Headers = await login(tech2.username);

  // 1. Create customer, device, and repair orders
  const custRes = await request(port, '/api/v1/customers', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ fullName: `Workflow Customer ${suffix}`, phone: '0988000111' })
  });
  expect(custRes.status === 201, `Customer creation failed: ${custRes.status}`);
  customerId = custRes.body.id;

  const devRes = await request(port, '/api/v1/devices', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ customerId, brand: 'Samsung', model: 'Inverter RT38' })
  });
  expect(devRes.status === 201, `Device creation failed: ${devRes.status}`);
  deviceId = devRes.body.id;

  const ro1Res = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ deviceId, reportedIssue: 'Does not cool' })
  });
  expect(ro1Res.status === 201, `RO1 creation failed: ${ro1Res.status}`);
  order1Id = ro1Res.body.id;

  const ro2Res = await request(port, '/api/v1/repair-orders', {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ deviceId, reportedIssue: 'Strange noise' })
  });
  expect(ro2Res.status === 201, `RO2 creation failed: ${ro2Res.status}`);
  order2Id = ro2Res.body.id;

  // 2. Assignment Authorization
  // Receptionist cannot assign technician
  const recAssign = await request(port, `/api/v1/repair-orders/${order1Id}/assignments`, {
    method: 'POST',
    headers: receptionHeaders,
    body: JSON.stringify({ technicianUserId: tech1Id })
  });
  expect(recAssign.status === 403, `Receptionist should be forbidden from assigning: got ${recAssign.status}`);

  // Tech 2 cannot assign technician
  const techAssign = await request(port, `/api/v1/repair-orders/${order1Id}/assignments`, {
    method: 'POST',
    headers: tech2Headers,
    body: JSON.stringify({ technicianUserId: tech1Id })
  });
  expect(techAssign.status === 403, `Technician should be forbidden from assigning: got ${techAssign.status}`);

  // Manager assigns Tech 1 to RO1
  const mgrAssign = await request(port, `/api/v1/repair-orders/${order1Id}/assignments`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ technicianUserId: tech1Id, notes: 'Assigned for initial inspection' })
  });
  expect(mgrAssign.status === 201, `Manager assignment failed: ${mgrAssign.status}`);

  // List assignments verifies active assignment
  const listAssign = await request(port, `/api/v1/repair-orders/${order1Id}/assignments`, { headers: managerHeaders });
  expect(listAssign.status === 200 && listAssign.body.items.length === 1, 'Assignments list failed');
  expect(listAssign.body.items[0].technicianUserId === tech1Id && listAssign.body.items[0].isActive === 1, 'Active assignment mismatch');

  // Verify RO detail includes assigned technician
  const roDetail = await request(port, `/api/v1/repair-orders/${order1Id}`, { headers: managerHeaders });
  expect(roDetail.body.assignedTechnicianId === tech1Id, 'Assigned technician not shown on repair order');

  // 3. Assignment enforcement: unassigned Tech 2 must be rejected
  const unassignedDiag = await request(port, `/api/v1/repair-orders/${order1Id}/diagnostics`, {
    method: 'POST',
    headers: tech2Headers,
    body: JSON.stringify({ diagnosisText: 'Unauthorized diagnosis' })
  });
  expect(unassignedDiag.status === 403 && unassignedDiag.body.error?.code === 'NOT_ASSIGNED', 'Unassigned technician was able to diagnose');

  const unassignedQuote = await request(port, `/api/v1/repair-orders/${order1Id}/quotes`, {
    method: 'POST',
    headers: tech2Headers,
    body: JSON.stringify({ laborAmount: 100000 })
  });
  expect(unassignedQuote.status === 403 && unassignedQuote.body.error?.code === 'NOT_ASSIGNED', 'Unassigned technician was able to quote');

  const unassignedTrans = await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: tech2Headers,
    body: JSON.stringify({ toStatus: 'DIAGNOSING' })
  });
  expect(unassignedTrans.status === 403 && unassignedTrans.body.error?.code === 'NOT_ASSIGNED', 'Unassigned technician was able to transition order');

  // 4. Assigned Tech 1 workflow: Transition -> Diagnose -> Quote
  const t1Trans = await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({ toStatus: 'DIAGNOSING' })
  });
  expect(t1Trans.status === 200 && t1Trans.body.repairStatus === 'DIAGNOSING', 'Assigned technician transition to DIAGNOSING failed');

  const diagRes = await request(port, `/api/v1/repair-orders/${order1Id}/diagnostics`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({
      diagnosisText: 'Blown start capacitor and degraded fan motor',
      recommendedAction: 'Replace 45uF capacitor and lubricate fan',
      estimatedLabor: 250000
    })
  });
  expect(diagRes.status === 201, `Diagnostic creation failed: ${diagRes.status}`);
  const diagnosticId = diagRes.body.id;

  const diagList = await request(port, `/api/v1/repair-orders/${order1Id}/diagnostics`, { headers: tech1Headers });
  expect(diagList.body.items.length === 1 && diagList.body.items[0].id === diagnosticId, 'Diagnostics list failed');

  // 5. Quote with items and versioning
  const q1Res = await request(port, `/api/v1/repair-orders/${order1Id}/quotes`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({
      diagnosticId,
      items: [
        { itemType: 'LABOR', description: 'Capacitor replacement labor', quantity: 1, unitPrice: 250000 },
        { itemType: 'PART', description: 'Capacitor 45uF', quantity: 1, unitPrice: 150000 }
      ],
      note: 'Initial quote sent to customer'
    })
  });
  expect(q1Res.status === 201, `Quote 1 creation failed: ${q1Res.status}`);
  expect(q1Res.body.versionNo === 1 && q1Res.body.status === 'PENDING_CUSTOMER', 'Quote 1 status/version error');
  expect(q1Res.body.items.length === 2, 'Quote 1 items missing');
  expect(q1Res.body.totalAmount === 400000, `Quote total expected 400000, got ${q1Res.body.totalAmount}`);
  const quote1Id = q1Res.body.id;

  // Quote creation automatically transitions order to AWAITING_ADMIN_APPROVAL
  const roAwaitingAdmin = await request(port, `/api/v1/repair-orders/${order1Id}`, { headers: tech1Headers });
  expect(roAwaitingAdmin.body.repairStatus === 'AWAITING_ADMIN_APPROVAL', 'Order should transition to AWAITING_ADMIN_APPROVAL');

  // Attempting to move directly to REPAIRING without approved quote must be rejected
  const prematureRepair = await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({ toStatus: 'REPAIRING' })
  });
  expect(prematureRepair.status === 409, `Should reject REPAIRING from AWAITING_ADMIN_APPROVAL: got ${prematureRepair.status}`);

  // Customer decision BEFORE admin approval must be rejected (409 ADMIN_APPROVAL_REQUIRED)
  const prematureCustomerDecide = await request(port, `/api/v1/repair-orders/${order1Id}/quotes/${quote1Id}/decisions`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({ decision: 'REJECTED', customerContactName: 'Bao Gia', note: 'Customer asked for discount' })
  });
  expect(prematureCustomerDecide.status === 409 && prematureCustomerDecide.body.error?.code === 'ADMIN_APPROVAL_REQUIRED', 'Customer decision without admin approval must return 409');

  // 6. Admin rejects Quote 1 (Tier 1 Rejection) requesting price adjustment
  const adminRejectQ1 = await request(port, `/api/v1/repair-orders/${order1Id}/quotes/${quote1Id}/admin-approval`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ decision: 'REJECTED', note: 'Chi phí linh kiện hơi cao, đề nghị thương lượng giảm giá' })
  });
  expect(adminRejectQ1.status === 200, 'Admin rejection for quote 1 failed');

  // Order moves back to ASSIGNED so tech can revise
  const roBackToAssigned = await request(port, `/api/v1/repair-orders/${order1Id}`, { headers: tech1Headers });
  expect(roBackToAssigned.body.repairStatus === 'ASSIGNED', 'Order should return to ASSIGNED after admin quote rejection');

  // Technician creates Quote version 2 with discount
  const q2Res = await request(port, `/api/v1/repair-orders/${order1Id}/quotes`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({
      diagnosticId,
      items: [
        { itemType: 'LABOR', description: 'Capacitor replacement labor (discounted)', quantity: 1, unitPrice: 200000 },
        { itemType: 'PART', description: 'Capacitor 45uF', quantity: 1, unitPrice: 150000 }
      ],
      discountAmount: 20000,
      note: 'Revised quote with 20k discount'
    })
  });
  expect(q2Res.status === 201 && q2Res.body.versionNo === 2, `Quote 2 creation failed: ${q2Res.status}`);
  const quote2Id = q2Res.body.id;

  // Order transitions to AWAITING_ADMIN_APPROVAL
  const ro2AwaitingAdmin = await request(port, `/api/v1/repair-orders/${order1Id}`, { headers: tech1Headers });
  expect(ro2AwaitingAdmin.body.repairStatus === 'AWAITING_ADMIN_APPROVAL', 'RO should transition to AWAITING_ADMIN_APPROVAL for quote 2');

  // Admin approves Quote 2 (Tier 1 Approval)
  const adminApproveQ2 = await request(port, `/api/v1/repair-orders/${order1Id}/quotes/${quote2Id}/admin-approval`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ decision: 'APPROVED', note: 'Admin duyệt mức giá mới' })
  });
  expect(adminApproveQ2.status === 200, 'Admin approval for quote 2 failed');

  // Order transitions to AWAITING_CUSTOMER_APPROVAL
  const ro2AwaitingCust = await request(port, `/api/v1/repair-orders/${order1Id}`, { headers: tech1Headers });
  expect(ro2AwaitingCust.body.repairStatus === 'AWAITING_CUSTOMER_APPROVAL', 'RO should transition to AWAITING_CUSTOMER_APPROVAL');

  // Customer approves Quote 2 (Tier 2 Approval) -> Order automatically becomes APPROVED
  const approveQuoteRes = await request(port, `/api/v1/repair-orders/${order1Id}/quotes/${quote2Id}/decisions`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({ decision: 'APPROVED', customerContactName: 'Bao Gia', note: 'Customer confirmed via phone call' })
  });
  expect(approveQuoteRes.status === 200 && approveQuoteRes.body.status === 'APPROVED', 'Quote 2 approval failed');

  // Verify repair order amounts snapshotted from approved quote: labor 200,000, parts 150,000, discount 20,000
  const updatedRO = await request(port, `/api/v1/repair-orders/${order1Id}`, { headers: tech1Headers });
  expect(updatedRO.body.repairStatus === 'APPROVED', 'Order should transition to APPROVED');
  expect(updatedRO.body.laborTotal === 200000, `laborTotal mismatch: ${updatedRO.body.laborTotal}`);
  expect(updatedRO.body.partsTotal === 150000, `partsTotal mismatch: ${updatedRO.body.partsTotal}`);
  expect(updatedRO.body.discountTotal === 20000, `discountTotal mismatch: ${updatedRO.body.discountTotal}`);

  // Now transition APPROVED -> REPAIRING must SUCCEED!
  const repairingWithQuote = await request(port, `/api/v1/repair-orders/${order1Id}/status-transitions`, {
    method: 'POST',
    headers: tech1Headers,
    body: JSON.stringify({ toStatus: 'REPAIRING' })
  });
  expect(repairingWithQuote.status === 200 && repairingWithQuote.body.repairStatus === 'REPAIRING', `REPAIRING transition failed: ${repairingWithQuote.status}`);

  // 7. Manager Exception / Override on RO2
  // Move RO2 to DIAGNOSING
  const ro2Diagnosing = await request(port, `/api/v1/repair-orders/${order2Id}/status-transitions`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ toStatus: 'DIAGNOSING' })
  });
  expect(ro2Diagnosing.status === 200, 'RO2 to DIAGNOSING failed');

  // Manager override requires reason
  const overrideNoReason = await request(port, `/api/v1/repair-orders/${order2Id}/status-transitions`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ toStatus: 'REPAIRING', override: true })
  });
  expect(overrideNoReason.status === 422, `Override without reason should return 422: got ${overrideNoReason.status}`);

  // Manager override with reason succeeds
  const overrideRes = await request(port, `/api/v1/repair-orders/${order2Id}/status-transitions`, {
    method: 'POST',
    headers: managerHeaders,
    body: JSON.stringify({ toStatus: 'REPAIRING', override: true, reason: 'VIP customer agreed in person' })
  });
  expect(overrideRes.status === 200 && overrideRes.body.repairStatus === 'REPAIRING', `Manager override failed: ${overrideRes.status}`);

  const ro2History = await request(port, `/api/v1/repair-orders/${order2Id}/status-history`, { headers: managerHeaders });
  const latestHistory = ro2History.body.items.at(-1);
  expect(latestHistory.reason.startsWith('OVERRIDE: VIP customer agreed in person'), 'Audit reason prefix OVERRIDE: not found in history');

  console.log('Workflow, assignments, diagnostics, and quotes integration verification PASSED!');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));

  const orderIds = [order1Id, order2Id].filter(Boolean);
  if (orderIds.length) {
    const placeholders = orderIds.map(() => '?').join(',');
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
    await db.query(`DELETE FROM repair_orders WHERE id IN (${placeholders})`, orderIds);
  }

  if (deviceId) await db.query('DELETE FROM devices WHERE id = ?', [deviceId]);
  if (customerId) await db.query('DELETE FROM customers WHERE id = ?', [customerId]);

  const userIds = [adminId, managerId, receptionId, tech1Id, tech2Id].filter(Boolean);
  if (userIds.length) {
    const uPlaceholders = userIds.map(() => '?').join(',');
    await db.query(`DELETE FROM auth_sessions WHERE user_id IN (${uPlaceholders})`, userIds);
    await db.query(`DELETE FROM user_roles WHERE user_id IN (${uPlaceholders})`, userIds);
    await db.query(`DELETE FROM users WHERE id IN (${uPlaceholders})`, userIds);
  }

  await db.end();
}

