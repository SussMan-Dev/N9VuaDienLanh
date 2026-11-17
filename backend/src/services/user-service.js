import { AppError } from '../lib/app-error.js';
import { hashPassword } from '../lib/password.js';
import { parseListQuery, listResponse } from '../lib/pagination.js';
import { positiveId, requireObject, string } from '../lib/validation.js';

export function createUserService(db) {
  return {
    async list(query = {}) {
      const page = parseListQuery(query, ['createdAt', 'fullName', 'username', 'id'], 'createdAt');
      const conditions = [];
      const params = [];

      // Exclude pure customer accounts from staff list by default unless requested
      if (query.role) {
        conditions.push('r.code = ?');
        params.push(string(query.role, 'role', { min: 1, max: 50 }));
      } else if (!query.includeCustomers) {
        conditions.push("(r.code IS NULL OR r.code != 'CUSTOMER')");
      }

      if (query.search) {
        const term = `%${query.search.trim()}%`;
        conditions.push('(u.username LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)');
        params.push(term, term, term, term);
      }

      if (query.branchId) {
        conditions.push('u.branch_id = ?');
        params.push(positiveId(query.branchId, 'branchId'));
      }

      if (query.isActive !== undefined && query.isActive !== '') {
        conditions.push('u.is_active = ?');
        params.push(query.isActive === 'true' || query.isActive === true ? 1 : 0);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const [countRows] = await db.query(
        `SELECT COUNT(DISTINCT u.id) AS total
         FROM users u
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         ${whereClause}`,
        params
      );
      const total = Number(countRows[0].total);

      // Data query with roles and technician load
      const [rows] = await db.query(
        `SELECT u.id, u.username, u.email, u.full_name AS fullName, u.phone,
                u.is_active AS isActive, u.last_login_at AS lastLoginAt,
                u.created_at AS createdAt, u.updated_at AS updatedAt,
                u.branch_id AS branchId, b.name AS branchName,
                GROUP_CONCAT(DISTINCT r.code) AS roleCodes,
                GROUP_CONCAT(DISTINCT r.name) AS roleNames,
                (
                  SELECT COUNT(*)
                  FROM repair_assignments ra
                  JOIN repair_orders ro ON ro.id = ra.repair_order_id
                  WHERE ra.technician_user_id = u.id
                    AND ra.unassigned_at IS NULL
                    AND ro.repair_status NOT IN ('COMPLETED', 'DELIVERED', 'CANCELLED', 'UNREPAIRABLE')
                ) AS activeRepairsCount
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         LEFT JOIN user_roles ur ON ur.user_id = u.id
         LEFT JOIN roles r ON r.id = ur.role_id
         ${whereClause}
         GROUP BY u.id
         ORDER BY u.created_at DESC, u.id DESC
         LIMIT ? OFFSET ?`,
        [...params, page.pageSize, page.offset]
      );

      const items = rows.map((r) => {
        const codes = r.roleCodes ? r.roleCodes.split(',') : [];
        const names = r.roleNames ? r.roleNames.split(',') : [];
        const roles = codes.map((code, idx) => ({
          code,
          name: names[idx] || code,
        }));

        return {
          id: r.id,
          username: r.username,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          isActive: Boolean(r.isActive),
          lastLoginAt: r.lastLoginAt,
          branchId: r.branchId,
          branchName: r.branchName,
          roles,
          primaryRole: roles[0]?.code || 'STAFF',
          activeRepairsCount: Number(r.activeRepairsCount || 0),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        };
      });

      return listResponse(items, total, page.page, page.pageSize);
    },

    async getRoles() {
      const [rows] = await db.query(
        `SELECT id, code, name, description
         FROM roles
         WHERE code != 'CUSTOMER'
         ORDER BY id ASC`
      );
      return { items: rows };
    },

    async get(id) {
      const userId = positiveId(id, 'id');
      const [rows] = await db.query(
        `SELECT u.id, u.username, u.email, u.full_name AS fullName, u.phone,
                u.is_active AS isActive, u.last_login_at AS lastLoginAt,
                u.created_at AS createdAt, u.updated_at AS updatedAt,
                u.branch_id AS branchId, b.name AS branchName
         FROM users u
         LEFT JOIN branches b ON b.id = u.branch_id
         WHERE u.id = ?`,
        [userId]
      );

      if (rows.length === 0) {
        throw new AppError(404, 'USER_NOT_FOUND', `User #${userId} not found`);
      }

      const user = rows[0];

      // Fetch roles
      const [roleRows] = await db.query(
        `SELECT r.id, r.code, r.name, r.description
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = ?`,
        [userId]
      );

      return {
        ...user,
        isActive: Boolean(user.isActive),
        roles: roleRows,
        primaryRole: roleRows[0]?.code || null,
      };
    },

    async create(body) {
      requireObject(body);
      const username = string(body.username, 'username', { required: true, min: 3, max: 80 });
      const password = string(body.password, 'password', { required: true, min: 6, max: 100 });
      const fullName = string(body.fullName, 'fullName', { required: true, min: 1, max: 160 });
      const email = string(body.email, 'email', { min: 3, max: 254 });
      const phone = string(body.phone, 'phone', { min: 3, max: 32 });
      const roleCode = string(body.roleCode || body.role, 'roleCode', { required: true, min: 1, max: 50 });
      let branchId = body.branchId ? positiveId(body.branchId, 'branchId') : null;

      // Default branch if not provided
      if (!branchId) {
        const [branches] = await db.query('SELECT id FROM branches WHERE is_active = TRUE LIMIT 1');
        if (branches.length > 0) {
          branchId = branches[0].id;
        }
      }

      // Check unique username
      const [existingUser] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUser.length > 0) {
        throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Tên đăng nhập này đã được sử dụng');
      }

      // Check unique email if given
      if (email) {
        const [existingEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
          throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email này đã được sử dụng');
        }
      }

      // Check role exists
      const [roleRows] = await db.query('SELECT id, code, name FROM roles WHERE code = ?', [roleCode]);
      if (roleRows.length === 0) {
        throw new AppError(404, 'ROLE_NOT_FOUND', `Vai trò ${roleCode} không tồn tại`);
      }
      const roleId = roleRows[0].id;

      const passwordHash = await hashPassword(password);

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const [insertResult] = await conn.query(
          `INSERT INTO users (branch_id, username, email, password_hash, full_name, phone, is_active)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [branchId, username, email, passwordHash, fullName, phone]
        );
        const newUserId = insertResult.insertId;

        await conn.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [newUserId, roleId]
        );

        await conn.commit();

        return {
          id: newUserId,
          username,
          fullName,
          email,
          phone,
          branchId,
          roles: [{ code: roleRows[0].code, name: roleRows[0].name }],
          primaryRole: roleRows[0].code,
          isActive: true,
        };
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },

    async update(id, body) {
      requireObject(body);
      const userId = positiveId(id, 'id');

      const [existing] = await db.query('SELECT id, username FROM users WHERE id = ?', [userId]);
      if (existing.length === 0) {
        throw new AppError(404, 'USER_NOT_FOUND', `User #${userId} not found`);
      }

      const updates = [];
      const params = [];

      if (body.fullName !== undefined) {
        updates.push('full_name = ?');
        params.push(string(body.fullName, 'fullName', { required: true, min: 1, max: 160 }));
      }

      if (body.phone !== undefined) {
        updates.push('phone = ?');
        params.push(string(body.phone, 'phone', { min: 0, max: 32 }));
      }

      if (body.email !== undefined) {
        const email = string(body.email, 'email', { min: 0, max: 254 });
        if (email) {
          const [dup] = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
          if (dup.length > 0) {
            throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email này đã được sử dụng bởi tài khoản khác');
          }
        }
        updates.push('email = ?');
        params.push(email);
      }

      if (body.branchId !== undefined) {
        updates.push('branch_id = ?');
        params.push(positiveId(body.branchId, 'branchId'));
      }

      if (body.isActive !== undefined) {
        updates.push('is_active = ?');
        params.push(body.isActive ? 1 : 0);
      }

      if (body.password) {
        const newPassword = string(body.password, 'password', { min: 6, max: 100 });
        const newHash = await hashPassword(newPassword);
        updates.push('password_hash = ?');
        params.push(newHash);
      }

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        if (updates.length > 0) {
          params.push(userId);
          await conn.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Update role if provided
        const roleCode = body.roleCode || body.role;
        if (roleCode) {
          const [roleRows] = await conn.query('SELECT id, code, name FROM roles WHERE code = ?', [roleCode]);
          if (roleRows.length === 0) {
            throw new AppError(404, 'ROLE_NOT_FOUND', `Vai trò ${roleCode} không tồn tại`);
          }
          await conn.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
          await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleRows[0].id]);
        }

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }

      return this.get(userId);
    },
  };
}

