import assert from 'node:assert/strict';
import test from 'node:test';
import { string, positiveId, requireObject } from '../src/lib/validation.js';

test('repair log payload validation', async (t) => {
  await t.test('requires workPerformed string', () => {
    assert.equal(string('   Kiem tra gas va nap them 200g   ', 'workPerformed', { required: true }), 'Kiem tra gas va nap them 200g');
    assert.throws(() => string('', 'workPerformed', { required: true }), { code: 'VALIDATION_ERROR' });
    assert.throws(() => string(null, 'workPerformed', { required: true }), { code: 'VALIDATION_ERROR' });
  });

  await t.test('validates optional diagnostic details with length cap', () => {
    assert.equal(string('May khong lanh', 'deviceCondition', { max: 5000 }), 'May khong lanh');
    assert.equal(string('Het gas R22', 'rootCause', { max: 5000 }), 'Het gas R22');
    assert.equal(string('May da lanh tot', 'testResult', { max: 5000 }), 'May da lanh tot');
    assert.throws(() => string('x'.repeat(5001), 'notes', { max: 5000 }), { code: 'VALIDATION_ERROR' });
  });

  await t.test('validates orderId and logId as positive integers', () => {
    assert.equal(positiveId(10, 'orderId'), 10);
    assert.equal(positiveId('25', 'logId'), 25);
    assert.throws(() => positiveId('invalid', 'orderId'), { code: 'VALIDATION_ERROR' });
    assert.throws(() => positiveId(-1, 'logId'), { code: 'VALIDATION_ERROR' });
  });

  await t.test('validates body object', () => {
    assert.doesNotThrow(() => requireObject({ workPerformed: 'Fixed' }));
    assert.throws(() => requireObject(null), { code: 'VALIDATION_ERROR' });
  });
});

