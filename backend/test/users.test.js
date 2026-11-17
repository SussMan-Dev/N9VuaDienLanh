import assert from 'node:assert/strict';
import test from 'node:test';
import { string, positiveId } from '../src/lib/validation.js';

test('user management payload validation', async (t) => {
  await t.test('requires username and password meeting length constraints', () => {
    assert.equal(string('ktv_tuan', 'username', { required: true, min: 3, max: 80 }), 'ktv_tuan');
    assert.equal(string('Secret123', 'password', { required: true, min: 6, max: 100 }), 'Secret123');

    assert.throws(
      () => string('ab', 'username', { required: true, min: 3, max: 80 }),
      { code: 'VALIDATION_ERROR' }
    );
    assert.throws(
      () => string('12345', 'password', { required: true, min: 6, max: 100 }),
      { code: 'VALIDATION_ERROR' }
    );
  });

  await t.test('validates fullName and roleCode', () => {
    assert.equal(string('Nguyễn Văn Tuấn', 'fullName', { required: true, min: 1, max: 160 }), 'Nguyễn Văn Tuấn');
    assert.equal(string('TECHNICIAN', 'roleCode', { required: true, min: 1, max: 50 }), 'TECHNICIAN');

    assert.throws(
      () => string('', 'fullName', { required: true, min: 1, max: 160 }),
      { code: 'VALIDATION_ERROR' }
    );
  });

  await t.test('validates positive branchId and userId', () => {
    assert.equal(positiveId(1, 'branchId'), 1);
    assert.equal(positiveId(15, 'userId'), 15);
    assert.throws(() => positiveId('invalid', 'branchId'), { code: 'VALIDATION_ERROR' });
  });
});

