import { Router } from 'express';
import { requireAnyPermission } from '../middleware/authenticate.js';
import { createUserService } from '../services/user-service.js';

export function createUserRouter(db) {
  const router = Router();
  const userService = createUserService(db);
  const permit = requireAnyPermission('system.manage', 'operations.manage');

  router.use('/api/v1/users', permit);

  // List users / staff
  router.get('/api/v1/users', async (req, res, next) => {
    try {
      const data = await userService.list(req.query);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  });

  // List available staff roles
  router.get('/api/v1/users/roles', async (req, res, next) => {
    try {
      const data = await userService.getRoles();
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  });

  // Create staff user
  router.post('/api/v1/users', async (req, res, next) => {
    try {
      const user = await userService.create(req.body);
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  });

  // Get user details
  router.get('/api/v1/users/:id', async (req, res, next) => {
    try {
      const user = await userService.get(req.params.id);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  });

  // Update user details
  router.patch('/api/v1/users/:id', async (req, res, next) => {
    try {
      const user = await userService.update(req.params.id, req.body);
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

