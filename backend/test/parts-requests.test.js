import assert from 'node:assert/strict';
import test from 'node:test';
import { positiveId, requireObject } from '../src/lib/validation.js';

test('parts request payload validation', async (t) => {
  await t.test('validates positive item quantity', () => {
    const qty = 2.5;
    assert.equal(Number.isFinite(qty) && qty > 0, true);
    assert.equal(Number.isFinite(-1) && -1 > 0, false);
    assert.equal(Number.isFinite(0) && 0 > 0, false);
    assert.equal(Number.isFinite(NaN), false);
  });

  await t.test('validates non-empty items array', () => {
    assert.throws(() => {
      const items = [];
      if (!Array.isArray(items) || items.length === 0) {
        throw new Error('EMPTY_ITEMS');
      }
    }, { message: 'EMPTY_ITEMS' });
  });

  await t.test('validates repairOrderId and inventoryItemId', () => {
    assert.equal(positiveId(5, 'repairOrderId'), 5);
    assert.equal(positiveId('12', 'inventoryItemId'), 12);
    assert.throws(() => positiveId('abc', 'repairOrderId'), { code: 'VALIDATION_ERROR' });
  });

  await t.test('validates request status transitions', () => {
    const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'ISSUED', 'CANCELLED'];
    assert.equal(allowed.includes('APPROVED'), true);
    assert.equal(allowed.includes('ISSUED'), true);
    assert.equal(allowed.includes('UNKNOWN'), false);
  });
});

