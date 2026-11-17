import { get, post } from './client.js';

export function getInvoices(params = {}) {
  const query = new URLSearchParams();
  if (params.repairOrderId) query.set('repairOrderId', String(params.repairOrderId));
  if (params.invoiceNumber) query.set('invoiceNumber', params.invoiceNumber);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return get(`/api/v1/invoices${qs ? `?${qs}` : ''}`);
}

export function getInvoice(id) {
  return get(`/api/v1/invoices/${id}`);
}

export function createInvoice(orderId, payload = {}) {
  return post(`/api/v1/repair-orders/${orderId}/invoice`, payload);
}

export function getInvoicePrintUrl(id) {
  return `http://localhost:3000/api/v1/invoices/${id}/print`;
}

