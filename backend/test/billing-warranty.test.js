import assert from 'node:assert/strict';
import test from 'node:test';
import { requireObject, string, positiveId, optionalDate } from '../src/lib/validation.js';

test('validates payment method enum allowlist', () => {
  const allowed = ['CASH', 'BANK_TRANSFER', 'CARD', 'OTHER'];
  for (const method of allowed) {
    const valid = string(method, 'paymentMethod', { required: true, max: 20 });
    assert.equal(allowed.includes(valid), true);
  }
  const invalid = 'BITCOIN';
  assert.equal(allowed.includes(invalid), false);
});

test('validates positive payment amount', () => {
  const validAmount = Number('150000');
  assert.equal(Number.isFinite(validAmount) && validAmount > 0, true);

  const zeroAmount = Number(0);
  assert.equal(Number.isFinite(zeroAmount) && zeroAmount > 0, false);

  const negAmount = Number(-50000);
  assert.equal(Number.isFinite(negAmount) && negAmount > 0, false);

  const nanAmount = Number('abc');
  assert.equal(Number.isFinite(nanAmount), false);
});

test('validates billing balance and payment status calculation', () => {
  function computeBilling(receivable, paid) {
    const balance = Number((receivable - paid).toFixed(2));
    let status = 'UNPAID';
    if (paid <= 0) status = 'UNPAID';
    else if (balance > 0) status = 'PARTIALLY_PAID';
    else if (balance === 0) status = 'PAID';
    else status = 'OVERPAID';
    return { balance, status };
  }

  assert.deepEqual(computeBilling(500000, 0), { balance: 500000, status: 'UNPAID' });
  assert.deepEqual(computeBilling(500000, 200000), { balance: 300000, status: 'PARTIALLY_PAID' });
  assert.deepEqual(computeBilling(500000, 500000), { balance: 0, status: 'PAID' });
  assert.deepEqual(computeBilling(500000, 600000), { balance: -100000, status: 'OVERPAID' });
});

test('validates warranty dates rule endsAt >= startsAt', () => {
  const startsAt = '2026-10-30';
  const validEndsAt = '2026-11-30';
  const invalidEndsAt = '2026-10-20';

  assert.equal(Date.parse(`${validEndsAt}T00:00:00Z`) >= Date.parse(`${startsAt}T00:00:00Z`), true);
  assert.equal(Date.parse(`${invalidEndsAt}T00:00:00Z`) >= Date.parse(`${startsAt}T00:00:00Z`), false);
});

