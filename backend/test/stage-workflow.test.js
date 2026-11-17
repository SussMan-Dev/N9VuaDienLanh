import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTransition, repairStatuses } from '../src/lib/repair-state-machine.js';

test('state machine includes all 10 stages', () => {
  const expected = [
    'PENDING',
    'ACCEPTED',
    'REJECTED',
    'ASSIGNED',
    'DIAGNOSING',
    'AWAITING_ADMIN_APPROVAL',
    'AWAITING_CUSTOMER_APPROVAL',
    'APPROVED',
    'IN_PROGRESS',
    'WAITING_PARTS',
    'COMPLETED',
    'PAID',
    'CANCELLED',
    'UNREPAIRABLE',
  ];
  for (const st of expected) {
    assert.ok(repairStatuses.includes(st), `Expected status ${st} to be defined in repairStatuses`);
  }
});

test('state machine executes full 10-stage happy path', () => {
  // GĐ 1 -> GĐ 2: PENDING -> ACCEPTED
  assert.doesNotThrow(() => validateTransition('PENDING', 'ACCEPTED'));

  // GĐ 2 -> GĐ 3: ACCEPTED -> ASSIGNED
  assert.doesNotThrow(() => validateTransition('ACCEPTED', 'ASSIGNED'));

  // GĐ 3 -> GĐ 4: ASSIGNED -> DIAGNOSING
  assert.doesNotThrow(() => validateTransition('ASSIGNED', 'DIAGNOSING'));

  // GĐ 4 -> GĐ 5: DIAGNOSING -> AWAITING_ADMIN_APPROVAL
  assert.doesNotThrow(() => validateTransition('DIAGNOSING', 'AWAITING_ADMIN_APPROVAL'));

  // GĐ 5 -> GĐ 6: AWAITING_ADMIN_APPROVAL -> AWAITING_CUSTOMER_APPROVAL
  assert.doesNotThrow(() => validateTransition('AWAITING_ADMIN_APPROVAL', 'AWAITING_CUSTOMER_APPROVAL'));

  // GĐ 6 -> GĐ 7: AWAITING_CUSTOMER_APPROVAL -> APPROVED -> IN_PROGRESS
  assert.doesNotThrow(() => validateTransition('AWAITING_CUSTOMER_APPROVAL', 'APPROVED'));
  assert.doesNotThrow(() => validateTransition('APPROVED', 'IN_PROGRESS'));

  // GĐ 7 -> GĐ 8: IN_PROGRESS -> WAITING_PARTS -> IN_PROGRESS
  assert.doesNotThrow(() => validateTransition('IN_PROGRESS', 'WAITING_PARTS'));
  assert.doesNotThrow(() => validateTransition('WAITING_PARTS', 'IN_PROGRESS'));

  // GĐ 8 -> GĐ 9: IN_PROGRESS -> COMPLETED
  assert.doesNotThrow(() => validateTransition('IN_PROGRESS', 'COMPLETED'));

  // GĐ 9 -> GĐ 10: COMPLETED -> PAID
  assert.doesNotThrow(() => validateTransition('COMPLETED', 'PAID'));
});

test('state machine handles rejection & revision flows', () => {
  // Receptionist rejects Ticket -> requires reason
  assert.throws(() => validateTransition('PENDING', 'REJECTED'), { code: 'TRANSITION_REASON_REQUIRED' });
  assert.doesNotThrow(() => validateTransition('PENDING', 'REJECTED', { reason: 'Thiết bị quá cũ không có linh kiện' }));

  // Admin rejects diagnosis/quote -> requests technician revision
  assert.doesNotThrow(() => validateTransition('AWAITING_ADMIN_APPROVAL', 'ASSIGNED'));
  assert.doesNotThrow(() => validateTransition('AWAITING_ADMIN_APPROVAL', 'DIAGNOSING'));

  // Customer rejects quote -> CANCELLED requires reason
  assert.throws(() => validateTransition('AWAITING_CUSTOMER_APPROVAL', 'CANCELLED'), { code: 'TRANSITION_REASON_REQUIRED' });
  assert.doesNotThrow(() => validateTransition('AWAITING_CUSTOMER_APPROVAL', 'CANCELLED', { reason: 'Chi phí quá cao' }));
});

test('state machine strictly prevents premature repair without approval', () => {
  assert.throws(() => validateTransition('PENDING', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('ACCEPTED', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('ASSIGNED', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('DIAGNOSING', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('AWAITING_ADMIN_APPROVAL', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('AWAITING_CUSTOMER_APPROVAL', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
});

