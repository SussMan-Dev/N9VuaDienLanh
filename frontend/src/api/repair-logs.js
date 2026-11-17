import { get, post, patch, del } from './client.js';

export function getRepairLogs(orderId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return get(`/api/v1/repair-orders/${orderId}/logs${qs ? `?${qs}` : ''}`);
}

export function createRepairLog(orderId, payload) {
  return post(`/api/v1/repair-orders/${orderId}/logs`, payload);
}

export function updateRepairLog(orderId, logId, payload) {
  return patch(`/api/v1/repair-orders/${orderId}/logs/${logId}`, payload);
}

export function deleteRepairLog(orderId, logId) {
  return del(`/api/v1/repair-orders/${orderId}/logs/${logId}`);
}

