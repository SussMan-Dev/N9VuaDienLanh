import assert from 'node:assert/strict';
import test from 'node:test';
import { validateTransition } from '../src/lib/repair-state-machine.js';

test('accepts every documented regular status transition', () => {
  const matrix = {
    // 10 giai đoạn mới
    PENDING: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
    ACCEPTED: ['ASSIGNED', 'DIAGNOSING', 'CANCELLED'],
    ASSIGNED: ['DIAGNOSING', 'AWAITING_ADMIN_APPROVAL', 'WAITING_APPROVAL', 'ACCEPTED', 'RECEIVED', 'CANCELLED'],
    DIAGNOSING: ['AWAITING_ADMIN_APPROVAL', 'AWAITING_CUSTOMER_APPROVAL', 'WAITING_APPROVAL', 'APPROVED', 'UNREPAIRABLE', 'CANCELLED'],
    AWAITING_ADMIN_APPROVAL: ['AWAITING_CUSTOMER_APPROVAL', 'ASSIGNED', 'DIAGNOSING', 'CANCELLED'],
    AWAITING_CUSTOMER_APPROVAL: ['APPROVED', 'AWAITING_ADMIN_APPROVAL', 'ASSIGNED', 'CANCELLED', 'UNREPAIRABLE'],
    APPROVED: ['IN_PROGRESS', 'REPAIRING', 'CANCELLED'],
    IN_PROGRESS: ['WAITING_PARTS', 'COMPLETED', 'WAITING_PAYMENT', 'READY_FOR_PICKUP', 'CANCELLED'],
    WAITING_PARTS: ['IN_PROGRESS', 'REPAIRING', 'CANCELLED'],
    COMPLETED: ['PAID', 'DELIVERED', 'READY_FOR_PICKUP'],
    PAID: ['DELIVERED'],
    // Tương thích ngược
    PENDING_RECEPTION: ['ACCEPTED', 'RECEIVED', 'REJECTED', 'CANCELLED'],
    RECEIVED: ['ASSIGNED', 'DIAGNOSING', 'CANCELLED'],
    WAITING_APPROVAL: ['APPROVED', 'AWAITING_CUSTOMER_APPROVAL', 'DIAGNOSING', 'CANCELLED', 'UNREPAIRABLE'],
    REPAIRING: ['READY_FOR_PICKUP', 'WAITING_PARTS', 'WAITING_PAYMENT', 'COMPLETED', 'UNREPAIRABLE'],
    WAITING_PAYMENT: ['PAID', 'COMPLETED', 'DELIVERED', 'CANCELLED'],
    READY_FOR_PICKUP: ['PAID', 'DELIVERED', 'REPAIRING'],
  };
  for (const [from, destinations] of Object.entries(matrix)) {
    for (const to of destinations) {
      validateTransition(from, to, { reason: ['CANCELLED', 'UNREPAIRABLE', 'REJECTED'].includes(to) ? 'Recorded reason' : null });
    }
  }
});
test('rejects forbidden and terminal transitions', () => {
  assert.throws(() => validateTransition('RECEIVED', 'DELIVERED'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('DELIVERED', 'REPAIRING'), { code: 'INVALID_STATUS_TRANSITION' });
  // Cannot jump from ASSIGNED directly to IN_PROGRESS without quote approval
  assert.throws(() => validateTransition('ASSIGNED', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('PENDING', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('REJECTED', 'IN_PROGRESS'), { code: 'INVALID_STATUS_TRANSITION' });
});
test('requires a reason for terminal outcomes and manager override', () => {
  assert.throws(() => validateTransition('RECEIVED', 'CANCELLED'), { code: 'TRANSITION_REASON_REQUIRED' });
  assert.throws(() => validateTransition('PENDING', 'REJECTED'), { code: 'TRANSITION_REASON_REQUIRED' });
  assert.throws(() => validateTransition('DIAGNOSING', 'REPAIRING', { override: true, roles: ['TECHNICIAN'] }), { code: 'INVALID_STATUS_TRANSITION' });
  assert.throws(() => validateTransition('DIAGNOSING', 'REPAIRING', { override: true, roles: ['MANAGER'] }), { code: 'TRANSITION_REASON_REQUIRED' });
  assert.deepEqual(validateTransition('DIAGNOSING', 'REPAIRING', { override: true, roles: ['MANAGER'], reason: 'Customer-approved emergency repair' }), { exceptionalRepairing: true });
});
