import { Router } from 'express';
import { requirePermission } from '../middleware/authenticate.js';
import * as svc from '../services/repair-log-service.js';

export function createRepairLogRouter(db) {
  const router = Router({ mergeParams: true });

  router.get('/', requirePermission('repair.manage'), async (req, res, next) => {
    try {
      const result = await svc.listRepairLogs(db, req.params.orderId, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/', requirePermission('repair.manage'), async (req, res, next) => {
    try {
      const log = await svc.createRepairLog(db, req.params.orderId, req.body, req.auth);
      res.status(201).json(log);
    } catch (error) {
      next(error);
    }
  });

  router.get('/:logId', requirePermission('repair.manage'), async (req, res, next) => {
    try {
      const log = await svc.getRepairLog(db, req.params.orderId, req.params.logId);
      res.status(200).json(log);
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:logId', requirePermission('repair.manage'), async (req, res, next) => {
    try {
      const log = await svc.updateRepairLog(db, req.params.orderId, req.params.logId, req.body, req.auth);
      res.status(200).json(log);
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:logId', requirePermission('repair.manage'), async (req, res, next) => {
    try {
      await svc.deleteRepairLog(db, req.params.orderId, req.params.logId, req.auth);
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

