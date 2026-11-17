import { get, patch, post } from './client.js';

export function getDevices(params = {}) {
  const query = new URLSearchParams();
  if (params.customerId) query.set('customerId', String(params.customerId));
  if (params.search) query.set('search', params.search);
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return get(`/api/v1/devices${qs ? `?${qs}` : ''}`);
}

export function getDevice(id) {
  return get(`/api/v1/devices/${id}`);
}

export function createDevice(payload) {
  return post('/api/v1/devices', payload);
}

export function updateDevice(id, payload) {
  return patch(`/api/v1/devices/${id}`, payload);
}

