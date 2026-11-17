import { Router } from 'express';
import { requireAnyPermission } from '../middleware/authenticate.js';
import * as svc from '../services/parts-request-service.js';

export function createPartsRequestRouter(db) {
  const router = Router();

  router.get(
    '/api/v1/parts-requests',
    requireAnyPermission('warehouse.manage', 'repair.manage', 'inventory.manage'),
    async (req, res, next) => {
      try {
        const result = await svc.listPartsRequests(db, req.query, req.auth);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/api/v1/parts-requests',
    requireAnyPermission('repair.manage', 'warehouse.manage'),
    async (req, res, next) => {
      try {
        const request = await svc.createPartsRequest(db, req.body, req.auth);
        res.status(201).json(request);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/api/v1/parts-requests/:id',
    requireAnyPermission('warehouse.manage', 'repair.manage', 'inventory.manage'),
    async (req, res, next) => {
      try {
        const request = await svc.getPartsRequest(db, req.params.id);
        res.status(200).json(request);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/api/v1/parts-requests/:id/approve',
    requireAnyPermission('warehouse.manage', 'operations.manage'),
    async (req, res, next) => {
      try {
        const request = await svc.approvePartsRequest(db, req.params.id, req.body, req.auth);
        res.status(200).json(request);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/api/v1/parts-requests/:id/reject',
    requireAnyPermission('warehouse.manage', 'operations.manage'),
    async (req, res, next) => {
      try {
        const request = await svc.rejectPartsRequest(db, req.params.id, req.body, req.auth);
        res.status(200).json(request);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/api/v1/parts-requests/:id/issue',
    requireAnyPermission('warehouse.manage', 'operations.manage'),
    async (req, res, next) => {
      try {
        const request = await svc.issuePartsRequest(db, req.params.id, req.auth);
        res.status(200).json(request);
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    '/api/v1/parts-requests/:id/cancel',
    requireAnyPermission('repair.manage', 'warehouse.manage'),
    async (req, res, next) => {
      try {
        const request = await svc.cancelPartsRequest(db, req.params.id, req.auth);
        res.status(200).json(request);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

