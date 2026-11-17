import { Router } from 'express';
import { requireAnyPermission } from '../middleware/authenticate.js';
import { positiveId } from '../lib/validation.js';
import { createWorkflowService } from '../services/workflow-service.js';
import * as svc from '../services/customer-portal-service.js';

export function createCustomerPortalRouter(db) {
  const router = Router();

  // All endpoints require customer self service or admin permission
  const checkCustomerAccess = requireAnyPermission('customer.self_service', 'system.manage');

  const handleCreateRequest = async (req, res, next) => {
    try {
      const result = await svc.createServiceRequest(db, req.body, req.auth);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  router.post('/api/v1/customer/requests', checkCustomerAccess, handleCreateRequest);
  router.post('/api/v1/customer/service-requests', checkCustomerAccess, handleCreateRequest);

  router.get('/api/v1/customer/orders', checkCustomerAccess, async (req, res, next) => {
    try {
      const result = await svc.listCustomerOrders(db, req.query, req.auth);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/customer/orders/:id', checkCustomerAccess, async (req, res, next) => {
    try {
      const result = await svc.getCustomerOrderDetail(db, req.params.id, req.auth);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/customer/orders/:id/quotes/:quoteId/decide', checkCustomerAccess, async (req, res, next) => {
    try {
      const workflow = createWorkflowService(db);
      const result = await workflow.decide(
        positiveId(req.params.id, 'id'),
        positiveId(req.params.quoteId, 'quoteId'),
        req.body,
        req.auth
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/customer/devices', checkCustomerAccess, async (req, res, next) => {
    try {
      const result = await svc.listCustomerDevices(db, req.auth);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/customer/devices', checkCustomerAccess, async (req, res, next) => {
    try {
      const result = await svc.createCustomerDevice(db, req.body, req.auth);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/customer/device-types', checkCustomerAccess, async (req, res, next) => {
    try {
      const result = await svc.listDeviceTypes(db);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/customer/warranties', checkCustomerAccess, async (req, res, next) => {
    try {
      const result = await svc.listCustomerWarranties(db, req.auth);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

