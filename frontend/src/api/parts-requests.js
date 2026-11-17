import { get, post, patch } from './client.js';

export function getPartsRequests(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.repairOrderId) query.set('repairOrderId', String(params.repairOrderId));
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return get(`/api/v1/parts-requests${qs ? `?${qs}` : ''}`);
}

export function getPartsRequest(id) {
  return get(`/api/v1/parts-requests/${id}`);
}

export function createPartsRequest(payload) {
  return post('/api/v1/parts-requests', payload);
}

export function approvePartsRequest(id, payload = {}) {
  return patch(`/api/v1/parts-requests/${id}/approve`, payload);
}

export function rejectPartsRequest(id, payload) {
  return patch(`/api/v1/parts-requests/${id}/reject`, payload);
}

export function issuePartsRequest(id) {
  return post(`/api/v1/parts-requests/${id}/issue`, {});
}

export function cancelPartsRequest(id) {
  return patch(`/api/v1/parts-requests/${id}/cancel`, {});
}

