import { Router } from 'express';
import { AppError } from '../lib/app-error.js';
import { createReportService } from '../services/report-service.js';

export function createReportRouter(db) {
  const router = Router();
  const service = createReportService(db);

  const canViewReports = (req, _res, next) => {
    const perms = req.auth.permissions || [];
    if (
      perms.includes('reports.view') ||
      perms.includes('operations.manage') ||
      perms.includes('system.manage') ||
      (req.auth.roles || []).includes('ADMIN') ||
      (req.auth.roles || []).includes('MANAGER')
    ) {
      return next();
    }
    return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to view reports'));
  };

  router.get('/api/v1/reports/summary', canViewReports, async (req, res, next) => {
    try {
      res.json(await service.getSummary());
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/reports/payments', canViewReports, async (req, res, next) => {
    try {
      res.json(await service.listAllPayments(req.query));
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/reports/warranties', canViewReports, async (req, res, next) => {
    try {
      res.json(await service.listAllWarranties(req.query));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

