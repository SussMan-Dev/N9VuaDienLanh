import { AppError } from '../lib/app-error.js';
import { hashSessionToken } from '../lib/session-token.js';
export function authenticate(db) {
  return async (req, _res, next) => {
    const header = req.get('authorization');
    if (!header?.startsWith('Bearer ')) return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
    const token = header.slice(7).trim();
    if (!token) return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
    try {
      const [rows] = await db.query(`SELECT u.id, u.branch_id, u.username, u.full_name, u.email, u.customer_id, s.id AS session_id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>UTC_TIMESTAMP() AND u.is_active=1`, [hashSessionToken(token)]);
      if (rows.length !== 1) return next(new AppError(401, 'INVALID_SESSION', 'Session is invalid or expired'));
      const user = rows[0];
      const [roles] = await db.query(`SELECT r.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=? ORDER BY r.code`, [user.id]);
      const [permissions] = await db.query(`SELECT DISTINCT p.code FROM user_roles ur JOIN role_permissions rp ON rp.role_id=ur.role_id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=? ORDER BY p.code`, [user.id]);
      req.auth = { user: { id: user.id, username: user.username, fullName: user.full_name, email: user.email, customerId: user.customer_id ?? null }, branchId: user.branch_id, sessionId: user.session_id, roles: roles.map((role) => role.code), permissions: permissions.map((permission) => permission.code) };
      await db.query('UPDATE auth_sessions SET last_seen_at=UTC_TIMESTAMP(), expires_at=DATE_ADD(UTC_TIMESTAMP(), INTERVAL 72 HOUR) WHERE id=?', [user.session_id]);
      next();
    } catch (error) { next(error); }
  };
}
export function requirePermission(permission) {
  return (req, _res, next) => req.auth.permissions.includes(permission) ? next() : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));
}

export function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    const hasRole = allowedRoles.some(r => req.auth.roles.includes(r));
    return hasRole ? next() : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));
  };
}

export function requireAnyPermission(...perms) {
  return (req, _res, next) => {
    const has = perms.some(p => req.auth.permissions.includes(p) || req.auth.roles.includes('ADMIN'));
    return has ? next() : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));
  };
}
