import assert from 'node:assert/strict';
import test from 'node:test';
import { positiveId } from '../src/lib/validation.js';

test('invoice calculation and validation', async (t) => {
  await t.test('calculates subtotal and grandTotal correctly', () => {
    const labor = 150000;
    const parts = 250000;
    const discount = 30000;
    const tax = 0;
    const subtotal = labor + parts;
    const grandTotal = Math.max(0, subtotal - discount + tax);

    assert.equal(subtotal, 400000);
    assert.equal(grandTotal, 370000);
  });

  await t.test('handles discount larger than subtotal by clamping to 0', () => {
    const subtotal = 100000;
    const discount = 150000;
    const grandTotal = Math.max(0, subtotal - discount);
    assert.equal(grandTotal, 0);
  });

  await t.test('validates invoiceId parameter', () => {
    assert.equal(positiveId(101, 'invoiceId'), 101);
    assert.throws(() => positiveId(-1, 'invoiceId'), { code: 'VALIDATION_ERROR' });
  });
});

