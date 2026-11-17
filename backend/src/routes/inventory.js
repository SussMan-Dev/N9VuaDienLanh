import { Router } from 'express';
import { requirePermission } from '../middleware/authenticate.js';
import { positiveId } from '../lib/validation.js';
import { AppError } from '../lib/app-error.js';
import { createInventoryService } from '../services/inventory-service.js';

export function createInventoryRouter(db) {
  const router = Router();
  const service = createInventoryService(db);
  const manage = requirePermission('inventory.manage');

  const canView = (req, _res, next) => {
    const perms = req.auth?.permissions || [];
    if (
      perms.includes('inventory.manage') ||
      perms.includes('repair.manage') ||
      perms.includes('operations.manage') ||
      perms.includes('system.manage')
    ) {
      return next();
    }
    return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to view inventory'));
  };

  // Warehouses
  router.get('/api/v1/inventory/warehouses', canView, async (req, res, next) => {
    try {
      const [rows] = await db.query(
        `SELECT w.id, w.branch_id AS branchId, b.name AS branchName, w.name, w.is_active AS isActive
         FROM warehouses w
         JOIN branches b ON b.id = w.branch_id
         WHERE w.is_active = 1
         ORDER BY w.name ASC`
      );
      res.json({ items: rows });
    } catch (err) {
      next(err);
    }
  });

  // Items
  router.get('/api/v1/inventory/items', canView, async (req, res, next) => {
    try {
      res.json(await service.listItems(req.query));
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/inventory/items', manage, async (req, res, next) => {
    try {
      res.status(201).json(await service.createItem(req.body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/inventory/items/:id', canView, async (req, res, next) => {
    try {
      res.json(await service.getItem(positiveId(req.params.id, 'id')));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/api/v1/inventory/items/:id', manage, async (req, res, next) => {
    try {
      res.json(await service.updateItem(positiveId(req.params.id, 'id'), req.body));
    } catch (err) {
      next(err);
    }
  });

  // Stocks
  router.get('/api/v1/inventory/stocks', canView, async (req, res, next) => {
    try {
      res.json(await service.listStocks(req.query));
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/inventory/stocks/:warehouseId/:itemId', canView, async (req, res, next) => {
    try {
      res.json(await service.getStock(req.params.warehouseId, req.params.itemId));
    } catch (err) {
      next(err);
    }
  });

  // Transactions
  router.post('/api/v1/inventory/transactions', manage, async (req, res, next) => {
    try {
      res.status(201).json(await service.addTransaction(req.body, req.auth));
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/inventory/transactions', canView, async (req, res, next) => {
    try {
      res.json(await service.getTransactions(req.query));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
