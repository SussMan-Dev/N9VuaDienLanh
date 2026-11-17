import { Router } from 'express';
import { createNotificationService } from '../services/notification-service.js';
import { AppError } from '../lib/app-error.js';

export function createNotificationRouter({ db }) {
  const router = Router();
  const service = createNotificationService();

  const ensureAuth = (req, _res, next) => {
    if (!req.auth?.user?.id) {
      return next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
    }
    next();
  };

  router.post('/api/v1/notifications/device-token', ensureAuth, async (req, res, next) => {
    try {
      const { token, deviceType } = req.body || {};
      const result = await service.registerToken(db, {
        userId: req.auth.user.id,
        token,
        deviceType,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/v1/notifications/device-token', ensureAuth, async (req, res, next) => {
    try {
      const { token } = req.body || {};
      const result = await service.unregisterToken(db, {
        userId: req.auth.user.id,
        token,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
