import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from '../src/lib/password.js';
test('password hash verifies only the original password', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
  assert.equal(await verifyPassword('incorrect password value', hash), false);
});
