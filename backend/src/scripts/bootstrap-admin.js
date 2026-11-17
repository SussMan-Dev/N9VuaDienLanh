import { env } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { hashPassword } from '../lib/password.js';
const username = process.env.BOOTSTRAP_ADMIN_USERNAME;
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
if (!username || !password || password.length < 12) throw new Error('Set BOOTSTRAP_ADMIN_USERNAME and BOOTSTRAP_ADMIN_PASSWORD (minimum 12 characters)');
const pool = createPool(env.db);
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const [[branch]] = await connection.query('SELECT id FROM branches WHERE code=? AND is_active=1', [process.env.BOOTSTRAP_BRANCH_CODE ?? 'HN-01']);
  if (!branch) throw new Error('Active bootstrap branch was not found');
  const [[role]] = await connection.query('SELECT id FROM roles WHERE code=\'ADMIN\'');
  if (!role) throw new Error('ADMIN role was not found; run migrations first');
  const [result] = await connection.query('INSERT INTO users (branch_id, username, password_hash, full_name) VALUES (?, ?, ?, ?)', [branch.id, username, await hashPassword(password), process.env.BOOTSTRAP_ADMIN_NAME ?? 'System Administrator']);
  await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [result.insertId, role.id]);
  await connection.commit();
  console.log(`Bootstrap admin created: ${username}`);
} catch (error) { await connection.rollback(); throw error; } finally { connection.release(); await pool.end(); }
