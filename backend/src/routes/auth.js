import { Router } from 'express';
import { AppError } from '../lib/app-error.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { createSessionToken, hashSessionToken } from '../lib/session-token.js';
import { authenticate } from '../middleware/authenticate.js';
import { clearLoginAttempts, loginRateLimit } from '../middleware/login-rate-limit.js';
const sessionHours = 72;
function validCredentials(body) { return body && typeof body.username === 'string' && body.username.trim().length >= 3 && body.username.length <= 80 && typeof body.password === 'string' && body.password.length >= 6 && body.password.length <= 256; }
export function createAuthRouter(db) {
  const router = Router();
  const auth = authenticate(db);
  router.post('/api/v1/auth/login', loginRateLimit, async (req, res, next) => {
    if (!validCredentials(req.body)) return next(new AppError(422, 'VALIDATION_ERROR', 'username and password are required', [{ field: 'username', message: '3-80 characters' }, { field: 'password', message: '6-256 characters' }]));
    try {
      const username = req.body.username.trim();
      const [rows] = await db.query('SELECT id, username, full_name, password_hash FROM users WHERE username=? AND is_active=1', [username]);
      if (rows.length !== 1 || !(await verifyPassword(req.body.password, rows[0].password_hash))) return next(new AppError(401, 'INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không chính xác'));
      const token = createSessionToken();
      await db.query('INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? HOUR))', [rows[0].id, hashSessionToken(token), sessionHours]);
      await db.query('UPDATE users SET last_login_at=UTC_TIMESTAMP() WHERE id=?', [rows[0].id]);
      clearLoginAttempts(req.loginRateLimitKey);
      res.status(200).json({ token, tokenType: 'Bearer', expiresInSeconds: sessionHours * 3600 });
    } catch (error) { next(error); }
  });
  router.post('/api/v1/auth/register', loginRateLimit, async (req, res, next) => {
    const { fullName, phone, email, username, password, address } = req.body ?? {};
    const errors = [];
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2)
      errors.push({ field: 'fullName', message: 'Họ tên tối thiểu 2 ký tự' });
    if (!phone || typeof phone !== 'string' || phone.trim().length < 9)
      errors.push({ field: 'phone', message: 'Số điện thoại không hợp lệ' });
    if (!username || typeof username !== 'string' || username.trim().length < 3 || username.length > 80)
      errors.push({ field: 'username', message: '3-80 ký tự' });
    if (!password || typeof password !== 'string' || password.length < 6 || password.length > 256)
      errors.push({ field: 'password', message: 'Mật khẩu tối thiểu 6 ký tự' });
    if (errors.length > 0) return next(new AppError(422, 'VALIDATION_ERROR', 'Dữ liệu không hợp lệ', errors));
    try {
      const [existing] = await db.query('SELECT id FROM users WHERE username=?', [username.trim()]);
      if (existing.length > 0) return next(new AppError(409, 'CONFLICT', 'Tên đăng nhập đã tồn tại'));
      const [[branch]] = await db.query('SELECT id FROM branches WHERE is_active=1 ORDER BY id LIMIT 1');
      if (!branch) return next(new AppError(500, 'INTERNAL_ERROR', 'Hệ thống chưa cấu hình chi nhánh'));
      const [[customerRole]] = await db.query("SELECT id FROM roles WHERE code='CUSTOMER'");
      if (!customerRole) return next(new AppError(500, 'INTERNAL_ERROR', 'Vai trò CUSTOMER chưa được cấu hình'));
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const customerCode = 'KH-' + Date.now().toString(36).toUpperCase();
        const [custResult] = await conn.query(
          'INSERT INTO customers (code, full_name, phone, email, address_line) VALUES (?, ?, ?, ?, ?)',
          [customerCode, fullName.trim(), phone.trim(), email?.trim() || null, address?.trim() || null]
        );
        const customerId = custResult.insertId;
        const passwordHash = await hashPassword(password);
        const [userResult] = await conn.query(
          'INSERT INTO users (branch_id, username, email, password_hash, full_name, phone, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [branch.id, username.trim(), email?.trim() || null, passwordHash, fullName.trim(), phone.trim(), customerId]
        );
        const userId = userResult.insertId;
        await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, customerRole.id]);
        await conn.commit();
        clearLoginAttempts(req.loginRateLimitKey);
        res.status(201).json({ message: 'Đăng ký thành công', userId, customerId });
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    } catch (error) { next(error); }
  });
  router.get('/api/v1/auth/me', auth, (req, res) => res.status(200).json({ user: req.auth.user, branchId: req.auth.branchId, roles: req.auth.roles, permissions: req.auth.permissions }));
  router.post('/api/v1/auth/logout', auth, async (req, res, next) => { try { await db.query('UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP() WHERE id=?', [req.auth.sessionId]); res.status(204).end(); } catch (error) { next(error); } });
  return router;
}
