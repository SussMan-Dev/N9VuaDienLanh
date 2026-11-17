import { randomUUID } from 'node:crypto';
import { AppError } from '../lib/app-error.js';
import { hashPassword } from '../lib/password.js';
import { listResponse, parseListQuery } from '../lib/pagination.js';
import { optionalBoolean, requireObject, string } from '../lib/validation.js';

const customerSorts = { code: 'code', fullName: 'full_name', phone: 'phone', createdAt: 'created_at' };

function customerPayload(body, partial = false) {
  requireObject(body);
  const normalizedBody = {
    ...body,
    phone: body.phone ?? body.phoneNumber,
    addressLine: body.addressLine ?? body.address,
  };
  const payload = {};
  for (const [key, options] of [
    ['fullName', { required: !partial, min: 1, max: 160 }],
    ['phone', { required: !partial, min: 6, max: 32 }],
    ['email', { max: 254 }],
    ['addressLine', { max: 255 }],
    ['notes', { max: 5000 }],
  ]) {
    const value = string(normalizedBody[key], key, options);
    if (value !== null || Object.hasOwn(normalizedBody, key)) payload[key] = value;
  }
  const isActive = optionalBoolean(body.isActive, 'isActive');
  if (isActive !== undefined) payload.isActive = isActive;
  if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'email is invalid');
  }
  return payload;
}

function map(row) {
  return {
    id: row.id,
    code: row.code,
    fullName: row.full_name,
    phone: row.phone,
    phoneNumber: row.phone,
    email: row.email,
    addressLine: row.address_line,
    address: row.address_line,
    notes: row.notes,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    account: row.user_id ? {
      id: row.user_id,
      username: row.user_username,
      email: row.user_email,
      isActive: Boolean(row.user_is_active),
      lastLoginAt: row.user_last_login_at,
    } : null,
  };
}

export function createCustomerService(db) {
  return {
    async list(query = {}) {
      const page = parseListQuery(query, Object.keys(customerSorts), 'createdAt');
      const search = typeof query.search === 'string' ? query.search.trim() : '';
      const includeInactive = query.includeInactive === 'true';
      const clauses = [];
      const values = [];

      if (!includeInactive) clauses.push('c.is_active=1');
      if (search) {
        clauses.push('(c.code LIKE ? OR c.full_name LIKE ? OR c.phone LIKE ? OR u.username LIKE ?)');
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const [[count]] = await db.query(
        `SELECT COUNT(*) AS total
         FROM customers c
         LEFT JOIN users u ON u.customer_id = c.id
         ${where}`,
        values
      );

      const [rows] = await db.query(
        `SELECT c.*,
                u.id AS user_id,
                u.username AS user_username,
                u.email AS user_email,
                u.is_active AS user_is_active,
                u.last_login_at AS user_last_login_at
         FROM customers c
         LEFT JOIN users u ON u.customer_id = c.id
         ${where}
         ORDER BY c.${customerSorts[page.sortBy]} ${page.sortOrder}
         LIMIT ? OFFSET ?`,
        [...values, page.pageSize, page.offset]
      );

      return listResponse(rows.map(map), count.total, page.page, page.pageSize);
    },

    async get(id) {
      const [rows] = await db.query(
        `SELECT c.*,
                u.id AS user_id,
                u.username AS user_username,
                u.email AS user_email,
                u.is_active AS user_is_active,
                u.last_login_at AS user_last_login_at
         FROM customers c
         LEFT JOIN users u ON u.customer_id = c.id
         WHERE c.id = ?`,
        [id]
      );
      if (!rows.length) {
        throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer was not found');
      }
      return map(rows[0]);
    },

    async create(body) {
      const value = customerPayload(body);
      const code = `CUS-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const [result] = await conn.query(
          'INSERT INTO customers (code, full_name, phone, email, address_line, notes, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [code, value.fullName, value.phone, value.email, value.addressLine, value.notes, value.isActive ?? true]
        );
        const customerId = result.insertId;

        // Optionally create online login account
        if (body.username && body.password) {
          const username = string(body.username, 'username', { required: true, min: 3, max: 80 });
          const password = string(body.password, 'password', { required: true, min: 6, max: 100 });

          const [dupUser] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
          if (dupUser.length > 0) {
            throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Tên đăng nhập này đã được sử dụng');
          }

          const [[branch]] = await conn.query('SELECT id FROM branches WHERE is_active=1 ORDER BY id LIMIT 1');
          const [[customerRole]] = await conn.query("SELECT id FROM roles WHERE code='CUSTOMER'");

          const passwordHash = await hashPassword(password);
          const [userRes] = await conn.query(
            'INSERT INTO users (branch_id, username, email, password_hash, full_name, phone, customer_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
            [branch?.id || null, username, value.email || null, passwordHash, value.fullName, value.phone, customerId]
          );
          if (customerRole) {
            await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userRes.insertId, customerRole.id]);
          }
        }

        await conn.commit();
        return this.get(customerId);
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },

    async update(id, body) {
      const value = customerPayload(body, true);
      if (!Object.keys(value).length) {
        throw new AppError(422, 'VALIDATION_ERROR', 'At least one field is required');
      }
      await this.get(id);
      const columns = {
        fullName: 'full_name',
        phone: 'phone',
        email: 'email',
        addressLine: 'address_line',
        notes: 'notes',
        isActive: 'is_active',
      };
      const keys = Object.keys(value);
      await db.query(
        `UPDATE customers SET ${keys.map((key) => `${columns[key]}=?`).join(',')} WHERE id=?`,
        [...keys.map((key) => value[key]), id]
      );

      // Also update linked user profile if exists
      if (value.fullName || value.phone || value.email) {
        const userUpdates = [];
        const userParams = [];
        if (value.fullName) { userUpdates.push('full_name = ?'); userParams.push(value.fullName); }
        if (value.phone) { userUpdates.push('phone = ?'); userParams.push(value.phone); }
        if (value.email !== undefined) { userUpdates.push('email = ?'); userParams.push(value.email); }
        if (userUpdates.length > 0) {
          userParams.push(id);
          await db.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE customer_id = ?`, userParams);
        }
      }

      return this.get(id);
    },

    async setAccount(id, body) {
      requireObject(body);
      const customer = await this.get(id);

      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();

        const [existingUsers] = await conn.query('SELECT id, username FROM users WHERE customer_id = ?', [id]);

        if (existingUsers.length > 0) {
          // Update existing account
          const userId = existingUsers[0].id;
          const userUpdates = [];
          const userParams = [];

          if (body.username) {
            const username = string(body.username, 'username', { min: 3, max: 80 });
            const [dup] = await conn.query('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (dup.length > 0) {
              throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Tên đăng nhập này đã được sử dụng');
            }
            userUpdates.push('username = ?');
            userParams.push(username);
          }

          if (body.password) {
            const password = string(body.password, 'password', { min: 6, max: 100 });
            const passwordHash = await hashPassword(password);
            userUpdates.push('password_hash = ?');
            userParams.push(passwordHash);
          }

          if (body.isActive !== undefined) {
            userUpdates.push('is_active = ?');
            userParams.push(body.isActive ? 1 : 0);
          }

          if (userUpdates.length > 0) {
            userParams.push(userId);
            await conn.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
          }

          // Revoke sessions if password changed or account deactivated
          if (body.password || body.isActive === false) {
            await conn.query('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ?', [userId]);
          }
        } else {
          // Create new user account for this customer
          const username = string(body.username, 'username', { required: true, min: 3, max: 80 });
          const password = string(body.password, 'password', { required: true, min: 6, max: 100 });

          const [dupUser] = await conn.query('SELECT id FROM users WHERE username = ?', [username]);
          if (dupUser.length > 0) {
            throw new AppError(409, 'USERNAME_ALREADY_EXISTS', 'Tên đăng nhập này đã được sử dụng');
          }

          const [[branch]] = await conn.query('SELECT id FROM branches WHERE is_active=1 ORDER BY id LIMIT 1');
          const [[customerRole]] = await conn.query("SELECT id FROM roles WHERE code='CUSTOMER'");

          const passwordHash = await hashPassword(password);
          const [userRes] = await conn.query(
            'INSERT INTO users (branch_id, username, email, password_hash, full_name, phone, customer_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)',
            [branch?.id || null, username, customer.email || null, passwordHash, customer.fullName, customer.phone, id]
          );

          if (customerRole) {
            await conn.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userRes.insertId, customerRole.id]);
          }
        }

        await conn.commit();
        return this.get(id);
      } catch (err) {
        await conn.rollback();
        throw err;
      } finally {
        conn.release();
      }
    },
  };
}
