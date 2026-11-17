import { Router } from 'express';
import { requireAnyPermission } from '../middleware/authenticate.js';
import * as svc from '../services/invoice-service.js';

export function createInvoiceRouter(db) {
  const router = Router();

  // Create invoice for a repair order
  router.post(
    '/api/v1/repair-orders/:orderId/invoice',
    requireAnyPermission('intake.manage', 'operations.manage', 'billing.manage'),
    async (req, res, next) => {
      try {
        const invoice = await svc.createInvoice(db, req.params.orderId, req.body, req.auth);
        res.status(201).json(invoice);
      } catch (error) {
        next(error);
      }
    }
  );

  // List all invoices
  router.get(
    '/api/v1/invoices',
    requireAnyPermission('intake.manage', 'reports.view', 'operations.manage', 'billing.manage'),
    async (req, res, next) => {
      try {
        const result = await svc.listInvoices(db, req.query);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get invoice detail
  router.get(
    '/api/v1/invoices/:id',
    requireAnyPermission('intake.manage', 'reports.view', 'customer.self_service', 'billing.manage'),
    async (req, res, next) => {
      try {
        const invoice = await svc.getInvoice(db, req.params.id);
        res.status(200).json(invoice);
      } catch (error) {
        next(error);
      }
    }
  );

  // Print/view HTML invoice
  router.get(
    '/api/v1/invoices/:id/print',
    async (req, res, next) => {
      try {
        const html = await svc.getInvoicePrintableHtml(db, req.params.id);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

