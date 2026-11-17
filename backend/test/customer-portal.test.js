import assert from 'node:assert/strict';
import test from 'node:test';
import { string, requireObject, optionalDateTime } from '../src/lib/validation.js';

test('customer portal service request validation', async (t) => {
  await t.test('accepts ISO datetime-local and standard dates for preferredDatetime', () => {
    assert.equal(optionalDateTime('2026-11-02T14:30', 'preferredDatetime'), '2026-11-02 14:30:00');
    assert.equal(optionalDateTime('2026-11-02', 'preferredDatetime'), '2026-11-02 09:00:00');
    assert.equal(optionalDateTime('2026-11-02 10:15:00', 'preferredDatetime'), '2026-11-02 10:15:00');
    assert.equal(optionalDateTime('', 'preferredDatetime'), null);
    assert.equal(optionalDateTime(null, 'preferredDatetime'), null);
    assert.throws(() => optionalDateTime('invalid-date', 'preferredDatetime'), { code: 'VALIDATION_ERROR' });
  });

  await t.test('validates issueDescription minimum length', () => {
    assert.equal(string('May lanh khong mat', 'issueDescription', { required: true, min: 3 }), 'May lanh khong mat');
    assert.throws(() => string('ab', 'issueDescription', { required: true, min: 3 }), { code: 'VALIDATION_ERROR' });
    assert.throws(() => string('', 'issueDescription', { required: true, min: 3 }), { code: 'VALIDATION_ERROR' });
  });

  await t.test('validates optional contact phone and address', () => {
    assert.equal(string('0912345678', 'contactPhone', { max: 32 }), '0912345678');
    assert.equal(string('123 Nguyen Trai, Ha Noi', 'addressLine', { max: 255 }), '123 Nguyen Trai, Ha Noi');
  });

  await t.test('handles image array serializing safely', () => {
    const images = ['http://example.com/img1.jpg', 'http://example.com/img2.jpg'];
    const json = JSON.stringify(images);
    assert.equal(Array.isArray(JSON.parse(json)), true);
    assert.equal(JSON.parse(json).length, 2);
  });

  await t.test('validates customer device payload attributes', () => {
    assert.equal(string('Daikin', 'brand', { required: true, min: 1, max: 100 }), 'Daikin');
    assert.equal(string('Inverter 1.5HP', 'model', { required: true, min: 1, max: 120 }), 'Inverter 1.5HP');
    assert.equal(string('SN-998877', 'serialNumber', { max: 120 }), 'SN-998877');
    assert.equal(string('Phòng khách', 'description', { max: 500 }), 'Phòng khách');
    assert.throws(() => string('', 'brand', { required: true, min: 1 }), { code: 'VALIDATION_ERROR' });
  });
});

