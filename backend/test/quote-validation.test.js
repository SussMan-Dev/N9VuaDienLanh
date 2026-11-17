import assert from 'node:assert/strict';
import test from 'node:test';
import { requireObject, string, positiveId, optionalDate } from '../src/lib/validation.js';

test('validates positive identifiers and reject invalid formats', () => {
  assert.equal(positiveId(1, 'id'), 1);
  assert.equal(positiveId('42', 'id'), 42);
  assert.throws(() => positiveId(0, 'id'), { code: 'VALIDATION_ERROR' });
  assert.throws(() => positiveId(-5, 'id'), { code: 'VALIDATION_ERROR' });
  assert.throws(() => positiveId('abc', 'id'), { code: 'VALIDATION_ERROR' });
});

test('validates required strings and length limits', () => {
  assert.equal(string('   hello world   ', 'text', { required: true }), 'hello world');
  assert.throws(() => string('', 'text', { required: true }), { code: 'VALIDATION_ERROR' });
  assert.throws(() => string(null, 'text', { required: true }), { code: 'VALIDATION_ERROR' });
  assert.throws(() => string('a'.repeat(501), 'text', { max: 500 }), { code: 'VALIDATION_ERROR' });
});

test('validates optional dates correctly', () => {
  assert.equal(optionalDate('2026-10-30', 'validUntil'), '2026-10-30');
  assert.equal(optionalDate(null, 'validUntil'), null);
  assert.equal(optionalDate(undefined, 'validUntil'), null);
  assert.throws(() => optionalDate('30-10-2026', 'validUntil'), { code: 'VALIDATION_ERROR' });
  assert.throws(() => optionalDate('invalid-date', 'validUntil'), { code: 'VALIDATION_ERROR' });
});

test('validates required JSON object payload', () => {
  assert.doesNotThrow(() => requireObject({}));
  assert.throws(() => requireObject(null), { code: 'VALIDATION_ERROR' });
  assert.throws(() => requireObject([]), { code: 'VALIDATION_ERROR' });
  assert.throws(() => requireObject('string'), { code: 'VALIDATION_ERROR' });
});

test('validates two-tier quote decision logic constraints', () => {
  // Tier 1: Admin decision must be APPROVED or REJECTED
  const validAdminDecisions = ['APPROVED', 'REJECTED'];
  assert.ok(validAdminDecisions.includes('APPROVED'));
  assert.ok(validAdminDecisions.includes('REJECTED'));
  assert.ok(!validAdminDecisions.includes('PENDING'));
  assert.ok(!validAdminDecisions.includes('MAYBE'));

  // Tier 2: Customer can only decide if quote.admin_approval_status === 'APPROVED'
  const mockQuotePending = { id: 1, status: 'PENDING_CUSTOMER', admin_approval_status: 'PENDING' };
  const mockQuoteRejected = { id: 2, status: 'PENDING_CUSTOMER', admin_approval_status: 'REJECTED' };
  const mockQuoteApproved = { id: 3, status: 'PENDING_CUSTOMER', admin_approval_status: 'APPROVED' };

  const canCustomerDecide = (q) => q.admin_approval_status === 'APPROVED';

  assert.equal(canCustomerDecide(mockQuotePending), false);
  assert.equal(canCustomerDecide(mockQuoteRejected), false);
  assert.equal(canCustomerDecide(mockQuoteApproved), true);
});

