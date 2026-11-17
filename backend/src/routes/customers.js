import { Router } from 'express';
import { requirePermission } from '../middleware/authenticate.js';
import { createCustomerService } from '../services/customer-service.js';
import { positiveId } from '../lib/validation.js';

export function createCustomerRouter(db) {
  const router = Router();
  const service = createCustomerService(db);
  const permit = requirePermission('intake.manage');

  router.use('/api/v1/customers', permit);

  router.get('/api/v1/customers', async (req, res, next) => {
    try {
      res.json(await service.list(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/customers', async (req, res, next) => {
    try {
      res.status(201).json(await service.create(req.body));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/customers/:id', async (req, res, next) => {
    try {
      res.json(await service.get(positiveId(req.params.id, 'id')));
    } catch (error) {
      next(error);
    }
  });

  router.patch('/api/v1/customers/:id', async (req, res, next) => {
    try {
      res.json(await service.update(positiveId(req.params.id, 'id'), req.body));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/customers/:id/account', async (req, res, next) => {
    try {
      res.json(await service.setAccount(positiveId(req.params.id, 'id'), req.body));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
