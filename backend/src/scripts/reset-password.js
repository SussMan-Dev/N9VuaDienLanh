import { env } from '../config/env.js';
import { createPool } from '../db/pool.js';
import { hashPassword } from '../lib/password.js';
const username = process.env.RESET_USERNAME;
const password = process.env.RESET_PASSWORD;
if (!username || !password || password.length < 12) throw new Error('Set RESET_USERNAME and RESET_PASSWORD (minimum 12 characters)');
const pool = createPool(env.db);
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const [result] = await connection.query('UPDATE users SET password_hash=? WHERE username=? AND is_active=1', [await hashPassword(password), username]);
  if (result.affectedRows !== 1) throw new Error('Active user was not found');
  await connection.query('UPDATE auth_sessions s JOIN users u ON u.id=s.user_id SET s.revoked_at=UTC_TIMESTAMP() WHERE u.username=? AND s.revoked_at IS NULL', [username]);
  await connection.commit();
  console.log(`Password reset and active sessions revoked: ${username}`);
} catch (error) { await connection.rollback(); throw error; } finally { connection.release(); await pool.end(); }
