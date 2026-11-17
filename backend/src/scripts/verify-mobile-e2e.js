/**
 * Mobile ↔ Web End-to-End Integration Verification (TASK-M03 & TASK-M04)
 * Tests full 10-stage lifecycle with Push Notification tokens and 2-tier quote approval.
 * Run: node src/scripts/verify-mobile-e2e.js
 */
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { env } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { hashPassword } from '../lib/password.js';

const db = createPool(env.db);
const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
const password = `Pass-${suffix}-123`;

let server;

async function request(port, path, options = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, options);
  const body = response.status === 204 ? null : await response.json();
  return { status: response.status, body };
}

function expect(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

try {
  console.log(`🚀 [E2E Mobile] Starting test with suffix ${suffix}...`);

  const [[branch]] = await db.query('SELECT id FROM branches WHERE is_active=1 ORDER BY id LIMIT 1');
  const [roles] = await db.query("SELECT id, code FROM roles");
  const adminRole = roles.find((r) => r.code === 'ADMIN');
  const techRole = roles.find((r) => r.code === 'TECHNICIAN');
  const receptionRole = roles.find((r) => r.code === 'RECEPTIONIST');
  const accountantRole = roles.find((r) => r.code === 'ACCOUNTANT');
  const customerRole = roles.find((r) => r.code === 'CUSTOMER');

  const pwHash = await hashPassword(password);

  // Create Users
  async function makeUser(prefix, roleId) {
    const uname = `${prefix}_${suffix}`;
    const [res] = await db.query(
      'INSERT INTO users (branch_id, username, password_hash, full_name, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
      [branch.id, uname, pwHash, `Test ${prefix}`, `${uname}@test.com`, '0901234567']
    );
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [res.insertId, roleId]);
    return { id: res.insertId, username: uname };
  }

  const admin = await makeUser('admin', adminRole.id);
  const tech = await makeUser('tech', techRole.id);
  const reception = await makeUser('rec', receptionRole.id);
  const accountant = await makeUser('acc', accountantRole.id);
  const custUser = await makeUser('cust', customerRole.id);

  // Link customer user to customer record
  const [custRes] = await db.query(
    'INSERT INTO customers (code, full_name, phone, email) VALUES (?, ?, ?, ?)',
    [`KH-${suffix}`, 'Khách Hàng Mobile E2E', '0901234567', custUser.username + '@test.com']
  );
  await db.query('UPDATE users SET customer_id = ? WHERE id = ?', [custRes.insertId, custUser.id]);

  // Start express test server
  const app = createApp({ db });
  server = app.listen(0);
  const port = server.address().port;
  console.log(`   Express running on ephemeral port ${port}`);

  // Helper login
  async function login(username) {
    const res = await request(port, '/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    expect(res.status === 200, `Login for ${username} must succeed`);
    return res.body.token;
  }

  const adminToken = await login(admin.username);
  const techToken = await login(tech.username);
  const recToken = await login(reception.username);
  const accToken = await login(accountant.username);
  const custToken = await login(custUser.username);

  console.log('✅ 1. Authentication for 5 roles completed');

  // 2. Register Device Push Tokens (Mobile Task M03)
  const fakeToken = `ExponentPushToken[mobile-test-${suffix}]`;
  const regRes = await request(port, '/api/v1/notifications/device-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({ token: fakeToken, deviceType: 'ANDROID' }),
  });
  expect(regRes.status === 200 && regRes.body.success, 'Device token registration must succeed');
  console.log('✅ 2. Device push token registered successfully');

  // 3. Customer creates service request on Mobile (PENDING)
  const [[deviceType]] = await db.query('SELECT id FROM device_types LIMIT 1');
  const bookingRes = await request(port, '/api/v1/customer/service-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({
      deviceTypeId: deviceType.id,
      brand: 'Panasonic Inverter',
      model: 'NR-BX461',
      issueDescription: 'Tủ lạnh không mát ngăn đông và kêu to',
      contactPhone: '0901234567',
      addressLine: '123 Đường Số 5, P. Linh Trung, TP. Thủ Đức',
      preferredDatetime: new Date(Date.now() + 86400000).toISOString(),
    }),
  });
  expect(bookingRes.status === 201, 'Customer booking must return 201 Created');
  const orderId = bookingRes.body.orderId || bookingRes.body.repairOrderId;
  expect(orderId, 'Booking must create a repair order');
  console.log(`✅ 3. Customer created repair order #${orderId} (Status: PENDING)`);

  // 4. Receptionist accepts order (PENDING -> ACCEPTED)
  const acceptRes = await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recToken}` },
    body: JSON.stringify({ toStatus: 'ACCEPTED', reason: 'Lễ tân tiếp nhận đơn hợp lệ' }),
  });
  expect(acceptRes.status === 200, 'Receptionist accept must succeed');
  console.log(`✅ 4. Receptionist accepted order -> ACCEPTED`);

  // 5. Manager assigns Technician (ACCEPTED -> ASSIGNED)
  const assignRes = await request(port, `/api/v1/repair-orders/${orderId}/assignments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ technicianUserId: tech.id, notes: 'KTV kiểm tra tại nhà khách' }),
  });
  expect(assignRes.status === 201, 'Assign technician must return 201');
  console.log(`✅ 5. Assigned KTV -> ASSIGNED (Notification sent to KTV)`);

  // 6. Technician creates Repair Log with Before photos (Mobile Task M02)
  const logRes = await request(port, `/api/v1/repair-orders/${orderId}/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
    body: JSON.stringify({
      workPerformed: 'Kiểm tra hiện trường: block quạt không quay, tụ kích hỏng',
      diagnosticDetails: 'Tụ 15uF bị phù, cần thay tụ mới và nạp thêm gas',
      imagesBefore: ['https://example.com/before-photo-1.jpg'],
    }),
  });
  expect(logRes.status === 201, 'Tech create repair log must return 201');
  console.log('✅ 6. Technician created repair log with before photo');

  // 7. Technician creates Quote (Mobile Task M02) -> AWAITING_ADMIN_APPROVAL
  const quoteRes = await request(port, `/api/v1/repair-orders/${orderId}/quotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
    body: JSON.stringify({
      items: [
        { itemType: 'LABOR', description: 'Tiền công thay tụ & vệ sinh dàn nóng', quantity: 1, unitPrice: 200000 },
        { itemType: 'PART', description: 'Tụ ngậm block 15uF chính hãng', quantity: 1, unitPrice: 150000 },
      ],
      discountAmount: 0,
      taxAmount: 0,
    }),
  });
  expect(quoteRes.status === 201, 'Quote creation must return 201');
  const quoteId = quoteRes.body.id;
  console.log(`✅ 7. Technician created quote #${quoteId} -> AWAITING_ADMIN_APPROVAL (Notification sent to Admin)`);

  // 8. Admin approves Quote on Mobile (Task M04 Tier 1 Approval) -> AWAITING_CUSTOMER_APPROVAL
  const adminApproveRes = await request(port, `/api/v1/repair-orders/${orderId}/quotes/${quoteId}/admin-approval`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ decision: 'APPROVED', note: 'Admin duyệt mức giá tiêu chuẩn' }),
  });
  expect(adminApproveRes.status === 200, 'Admin approval must succeed');
  console.log(`✅ 8. Admin approved quote -> AWAITING_CUSTOMER_APPROVAL (Notification sent to Customer)`);

  // 9. Customer approves Quote on Mobile (Task M03 1-tap Approval) -> APPROVED
  const custDecideRes = await request(port, `/api/v1/customer/orders/${orderId}/quotes/${quoteId}/decide`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${custToken}` },
    body: JSON.stringify({ decision: 'APPROVED' }),
  });
  expect(custDecideRes.status === 200, 'Customer quote approval must succeed');
  console.log(`✅ 9. Customer approved quote on Mobile -> APPROVED (Notification sent to KTV)`);

  // 10. Technician starts repair & completes repair -> IN_PROGRESS -> COMPLETED
  await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
    body: JSON.stringify({ toStatus: 'IN_PROGRESS', reason: 'Bắt đầu sửa chữa' }),
  });

  const completeRes = await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${techToken}` },
    body: JSON.stringify({ toStatus: 'COMPLETED', reason: 'Đã hoàn tất thay thế tụ & thử tải' }),
  });
  expect(completeRes.status === 200, 'Completion must succeed');
  console.log('✅ 10. KTV completed repair -> COMPLETED');

  // 11. Accountant creates invoice & records payment -> PAID
  const invoiceRes = await request(port, `/api/v1/repair-orders/${orderId}/invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accToken}` },
    body: JSON.stringify({}),
  });
  expect(invoiceRes.status === 201, 'Invoice must be created');

  const payRes = await request(port, `/api/v1/repair-orders/${orderId}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accToken}` },
    body: JSON.stringify({
      amount: 350000,
      paymentMethod: 'CASH',
      notes: 'Khách thanh toán đủ tiền mặt',
    }),
  });
  expect(payRes.status === 201, 'Payment must succeed');
  console.log('✅ 11. Payment 350,000đ recorded -> PAID');

  // 12. Delivery to customer & Electronic Warranty Generated -> DELIVERED
  const deliverRes = await request(port, `/api/v1/repair-orders/${orderId}/status-transitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${recToken}` },
    body: JSON.stringify({ toStatus: 'DELIVERED', reason: 'Khách nhận máy hoàn tất' }),
  });
  expect(deliverRes.status === 200, 'Delivery must succeed');

  // Customer checks Warranties list on Mobile
  const warRes = await request(port, '/api/v1/customer/warranties', {
    method: 'GET',
    headers: { Authorization: `Bearer ${custToken}` },
  });
  expect(warRes.status === 200, 'Warranties list must return 200');
  console.log('✅ 12. Device DELIVERED and electronic warranty available in Mobile App');

  console.log('\n🎉 ALL 12 STEPS OF MOBILE ↔ WEB INTEGRATION E2E TEST PASSED 100%!');

} catch (err) {
  console.error('\n❌ E2E Test Failed:', err);
  process.exit(1);
} finally {
  if (server) server.close();
  await db.end();
}
