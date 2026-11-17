import { del, get, post } from './client.js';

export function getRepairOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.customerId) query.set('customerId', String(params.customerId));
  if (params.deviceId) query.set('deviceId', String(params.deviceId));
  if (params.repairStatus) query.set('repairStatus', params.repairStatus);
  if (params.originalRepairOrderId) query.set('originalRepairOrderId', String(params.originalRepairOrderId));
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return get(`/api/v1/repair-orders${qs ? `?${qs}` : ''}`);
}

export function getRepairOrder(id) {
  return get(`/api/v1/repair-orders/${id}`);
}

export function createRepairOrder(payload) {
  return post('/api/v1/repair-orders', payload);
}

export function getStatusHistory(id) {
  return get(`/api/v1/repair-orders/${id}/status-history`);
}

export function transitionStatus(id, payload) {
  return post(`/api/v1/repair-orders/${id}/status-transitions`, payload);
}

export function getTechnicians() {
  return get('/api/v1/technicians');
}

export function getAssignments(id) {
  return get(`/api/v1/repair-orders/${id}/assignments`);
}

export function assignTechnician(id, payload) {
  return post(`/api/v1/repair-orders/${id}/assignments`, payload);
}

export function getDiagnostics(id) {
  return get(`/api/v1/repair-orders/${id}/diagnostics`);
}

export function addDiagnostic(id, payload) {
  return post(`/api/v1/repair-orders/${id}/diagnostics`, payload);
}

export function getQuotes(id) {
  return get(`/api/v1/repair-orders/${id}/quotes`);
}

export function getQuote(id, quoteId) {
  return get(`/api/v1/repair-orders/${id}/quotes/${quoteId}`);
}

export function createQuote(id, payload) {
  return post(`/api/v1/repair-orders/${id}/quotes`, payload);
}

export function decideQuote(id, quoteId, payload) {
  return post(`/api/v1/repair-orders/${id}/quotes/${quoteId}/decisions`, payload);
}

export function adminDecideQuote(id, quoteId, payload) {
  return post(`/api/v1/repair-orders/${id}/quotes/${quoteId}/admin-approval`, payload);
}

export function getParts(id) {
  return get(`/api/v1/repair-orders/${id}/parts`);
}

export function addPart(id, payload) {
  return post(`/api/v1/repair-orders/${id}/parts`, payload);
}

export function removePart(id, partId) {
  return del(`/api/v1/repair-orders/${id}/parts/${partId}`);
}

export function getBilling(id) {
  return get(`/api/v1/repair-orders/${id}/billing`);
}

export function getPayments(id) {
  return get(`/api/v1/repair-orders/${id}/payments`);
}

export function createPayment(id, payload) {
  return post(`/api/v1/repair-orders/${id}/payments`, payload);
}

export function voidPayment(id, paymentId, payload) {
  return post(`/api/v1/repair-orders/${id}/payments/${paymentId}/void`, payload);
}

export function getWarranties(id) {
  return get(`/api/v1/repair-orders/${id}/warranties`);
}

export function createWarranty(id, payload) {
  return post(`/api/v1/repair-orders/${id}/warranties`, payload);
}

export function getWarrantyClaims(id) {
  return get(`/api/v1/repair-orders/${id}/warranty-claims`);
}

