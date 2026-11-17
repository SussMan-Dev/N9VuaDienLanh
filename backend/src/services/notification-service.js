/**
 * Notification Service — Quản lý token thiết bị và gửi thông báo đẩy (Push Notifications)
 */
import { AppError } from '../lib/app-error.js';

export function createNotificationService() {
  return {
    async registerToken(db, { userId, token, deviceType = 'MOBILE' }) {
      if (!userId || !token) {
        throw new AppError(422, 'VALIDATION_ERROR', 'userId and token are required');
      }

      await db.query(
        `INSERT INTO user_device_tokens (user_id, token, device_type, last_used_at)
         VALUES (?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE device_type = VALUES(device_type), last_used_at = CURRENT_TIMESTAMP`,
        [userId, token, deviceType]
      );

      return { success: true, message: 'Đăng ký token thông báo thành công' };
    },

    async unregisterToken(db, { userId, token }) {
      if (!userId || !token) return { success: false };
      await db.query('DELETE FROM user_device_tokens WHERE user_id = ? AND token = ?', [userId, token]);
      return { success: true };
    },

    async getUserTokens(db, userId) {
      const [rows] = await db.query(
        'SELECT token, device_type AS deviceType FROM user_device_tokens WHERE user_id = ?',
        [userId]
      );
      return rows;
    },

    /**
     * Gửi Push Notification tới danh sách User ID
     * Tương thích với Expo Push Notification API & FCM
     */
    async sendNotification(db, { userIds, title, body, data = {} }) {
      if (!userIds || (Array.isArray(userIds) && userIds.length === 0)) return { sent: 0 };
      const ids = Array.isArray(userIds) ? userIds : [userIds];

      const [tokens] = await db.query(
        'SELECT token FROM user_device_tokens WHERE user_id IN (?)',
        [ids]
      );

      if (!tokens.length) return { sent: 0, reason: 'NO_DEVICE_TOKENS_REGISTERED' };

      const messages = tokens.map((t) => ({
        to: t.token,
        sound: 'default',
        title,
        body,
        data,
      }));

      // Khi chạy thực tế, gửi tới Expo Push API
      try {
        if (process.env.NODE_ENV !== 'test') {
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
          });
        }
      } catch (err) {
        // Không block flow chính nếu gửi thông báo thất bại
        console.warn('[NotificationService] Push notification send error:', err.message);
      }

      return { sent: messages.length };
    },
  };
}
