import { Router } from 'express';
import { requirePermission } from '../middleware/authenticate.js';
import { positiveId } from '../lib/validation.js';
import { createRepairOrderService } from '../services/repair-order-service.js';
import { AppError } from '../lib/app-error.js';
import { createWorkflowService } from '../services/workflow-service.js';
import { createRepairPartsService } from '../services/repair-parts-service.js';
import { createBillingService } from '../services/billing-service.js';
import { createWarrantyService } from '../services/warranty-service.js';

export function createRepairOrderRouter(db) {
  const router = Router();
  const service = createRepairOrderService(db);
  const workflow = createWorkflowService(db);
  const parts = createRepairPartsService(db);
  const billing = createBillingService(db);
  const warranty = createWarrantyService(db);

  const intake = requirePermission('intake.manage');
  const repair = (req, _res, next) =>
    req.auth.permissions.some((item) => item === 'repair.manage' || item === 'operations.manage')
      || (req.auth.roles && (req.auth.roles.includes('ADMIN') || req.auth.roles.includes('MANAGER') || req.auth.roles.includes('RECEPTIONIST')))
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));

  const cashier = (req, _res, next) =>
    req.auth.permissions.some((item) => item === 'intake.manage' || item === 'operations.manage' || item === 'billing.manage')
      || (req.auth.roles && (req.auth.roles.includes('ACCOUNTANT') || req.auth.roles.includes('ADMIN') || req.auth.roles.includes('RECEPTIONIST')))
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));

  const canTransition = (req, _res, next) =>
    req.auth.permissions.some((item) =>
      item === 'repair.manage' ||
      item === 'operations.manage' ||
      item === 'intake.manage' ||
      item === 'billing.manage' ||
      item === 'system.manage'
    ) || (req.auth.roles && (req.auth.roles.includes('ADMIN') || req.auth.roles.includes('RECEPTIONIST') || req.auth.roles.includes('MANAGER') || req.auth.roles.includes('ACCOUNTANT')))
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));

  const canDecideQuote = (req, _res, next) =>
    req.auth.permissions.some((item) =>
      item === 'repair.manage' ||
      item === 'operations.manage' ||
      item === 'intake.manage' ||
      item === 'system.manage'
    ) || (req.auth.roles && (req.auth.roles.includes('ADMIN') || req.auth.roles.includes('RECEPTIONIST') || req.auth.roles.includes('MANAGER') || req.auth.roles.includes('TECHNICIAN')))
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));

  const adminOrOps = (req, _res, next) =>
    req.auth.permissions.some((item) => item === 'operations.manage' || item === 'system.manage') ||
    (req.auth.roles && (req.auth.roles.includes('ADMIN') || req.auth.roles.includes('MANAGER')))
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'Chỉ Quản trị viên mới có quyền thẩm định và phê duyệt báo giá'));

  const anyStaff = (req, _res, next) =>
    req.auth.permissions.some((item) =>
      item === 'intake.manage' ||
      item === 'repair.manage' ||
      item === 'operations.manage' ||
      item === 'inventory.manage' ||
      item === 'warehouse.manage' ||
      item === 'billing.manage'
    ) || (req.auth.roles && (req.auth.roles.includes('ADMIN') || req.auth.roles.includes('MANAGER') || req.auth.roles.includes('ACCOUNTANT') || req.auth.roles.includes('RECEPTIONIST') || req.auth.roles.includes('TECHNICIAN') || req.auth.roles.includes('WAREHOUSE_MANAGER') || req.auth.roles.includes('WAREHOUSE_STAFF')))
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'You do not have permission for this action'));

  router.get('/api/v1/technicians', anyStaff, async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `SELECT u.id, u.username, u.full_name AS fullName, u.phone
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN roles r ON r.id = ur.role_id
         WHERE u.is_active = 1 AND r.code = 'TECHNICIAN'
         ORDER BY u.full_name ASC`
      );
      res.json({ items: rows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/repair-orders', anyStaff, async (req, res, next) => {
    try {
      res.json(await service.list(req.query));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/repair-orders', intake, async (req, res, next) => {
    try {
      res.status(201).json(await service.create(req.body, req.auth));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/repair-orders/:id/assignments', anyStaff, async (req, res, next) => {
    try {
      res.json(await workflow.listAssignments(positiveId(req.params.id, 'id')));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/repair-orders/:id/assignments', repair, async (req, res, next) => {
    try {
      res.status(201).json(await workflow.assign(positiveId(req.params.id, 'id'), req.body, req.auth));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/repair-orders/:id/diagnostics', anyStaff, async (req, res, next) => {
    try {
      res.json(await workflow.listDiagnostics(positiveId(req.params.id, 'id')));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/repair-orders/:id/diagnostics', repair, async (req, res, next) => {
    try {
      res.status(201).json(await workflow.diagnose(positiveId(req.params.id, 'id'), req.body, req.auth));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/repair-orders/:id/quotes', anyStaff, async (req, res, next) => {
    try {
      res.json(await workflow.listQuotes(positiveId(req.params.id, 'id')));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/repair-orders/:id/quotes/:quoteId', anyStaff, async (req, res, next) => {
    try {
      res.json(await workflow.getQuote(positiveId(req.params.id, 'id'), positiveId(req.params.quoteId, 'quoteId')));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/repair-orders/:id/quotes', repair, async (req, res, next) => {
    try {
      res.status(201).json(await workflow.quote(positiveId(req.params.id, 'id'), req.body, req.auth));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/repair-orders/:id/quotes/:quoteId/decisions', canDecideQuote, async (req, res, next) => {
    try {
      res.json(await workflow.decide(positiveId(req.params.id, 'id'), positiveId(req.params.quoteId, 'quoteId'), req.body, req.auth));
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/repair-orders/:id/quotes/:quoteId/admin-approval', adminOrOps, async (req, res, next) => {
    try {
      res.json(await workflow.adminDecideQuote(positiveId(req.params.id, 'id'), positiveId(req.params.quoteId, 'quoteId'), req.body, req.auth));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/repair-orders/:id', anyStaff, async (req, res, next) => {
    try {
      res.json(await service.get(positiveId(req.params.id, 'id')));
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/repair-orders/:id/status-history', anyStaff, async (req, res, next) => {
    try {
      res.json({ items: await service.history(positiveId(req.params.id, 'id')) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/repair-orders/:id/status-transitions', canTransition, async (req, res, next) => {
    try {
      res.json(await service.transition(positiveId(req.params.id, 'id'), req.body, req.auth));
    } catch (error) {
      next(error);
    }
  });

  // Parts endpoints
  router.get('/api/v1/repair-orders/:id/parts', anyStaff, async (req, res, next) => {
    try {
      res.json(await parts.listParts(positiveId(req.params.id, 'id')));
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/repair-orders/:id/parts', repair, async (req, res, next) => {
    try {
      res.status(201).json(await parts.addPart(positiveId(req.params.id, 'id'), req.body, req.auth));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/api/v1/repair-orders/:id/parts/:partId', repair, async (req, res, next) => {
    try {
      res.json(await parts.removePart(positiveId(req.params.id, 'id'), positiveId(req.params.partId, 'partId'), req.auth));
    } catch (err) {
      next(err);
    }
  });

  // Billing and Payments endpoints
  router.get('/api/v1/repair-orders/:id/billing', anyStaff, async (req, res, next) => {
    try {
      res.json(await billing.getBillingSummary(positiveId(req.params.id, 'id')));
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/repair-orders/:id/payments', anyStaff, async (req, res, next) => {
    try {
      res.json(await billing.listPayments(positiveId(req.params.id, 'id')));
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/repair-orders/:id/payments', cashier, async (req, res, next) => {
    try {
      res.status(201).json(await billing.createPayment(positiveId(req.params.id, 'id'), req.body, req.auth));
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/repair-orders/:id/payments/:paymentId/void', requirePermission('operations.manage'), async (req, res, next) => {
    try {
      res.json(await billing.voidPayment(positiveId(req.params.id, 'id'), positiveId(req.params.paymentId, 'paymentId'), req.body, req.auth));
    } catch (err) {
      next(err);
    }
  });

  // Warranties endpoints
  router.get('/api/v1/repair-orders/:id/warranties', anyStaff, async (req, res, next) => {
    try {
      res.json(await warranty.listWarranties(positiveId(req.params.id, 'id')));
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/repair-orders/:id/warranties', repair, async (req, res, next) => {
    try {
      res.status(201).json(await warranty.createWarranty(positiveId(req.params.id, 'id'), req.body, req.auth));
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/repair-orders/:id/warranty-claims', anyStaff, async (req, res, next) => {
    try {
      res.json(await warranty.listWarrantyClaims(positiveId(req.params.id, 'id')));
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/warranties/:code', anyStaff, async (req, res, next) => {
    try {
      res.json(await warranty.getByCode(req.params.code));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
