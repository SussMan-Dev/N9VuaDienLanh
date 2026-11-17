import assert from 'node:assert/strict';
import test from 'node:test';
import { parseListQuery } from '../src/lib/pagination.js';
test('pagination only permits allowlisted sort fields', () => { const result = parseListQuery({ page: '2', pageSize: '10', sortBy: 'name', sortOrder: 'desc' }, ['name'], 'name'); assert.deepEqual(result, { page: 2, pageSize: 10, offset: 10, sortBy: 'name', sortOrder: 'DESC' }); });
test('pagination rejects unsafe sort fields', () => { assert.throws(() => parseListQuery({ sortBy: 'name; DROP TABLE customers' }, ['name'], 'name'), { code: 'VALIDATION_ERROR' }); });
