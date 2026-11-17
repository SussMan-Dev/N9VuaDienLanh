import { get, post } from './client.js';

export function createCustomerRequest(payload) {
  return post('/api/v1/customer/requests', payload);
}

export function getCustomerOrders(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  const qs = query.toString();
  return get(`/api/v1/customer/orders${qs ? `?${qs}` : ''}`);
}

export function getCustomerOrderDetail(id) {
  return get(`/api/v1/customer/orders/${id}`);
}

export function decideCustomerQuote(orderId, quoteId, payload) {
  return post(`/api/v1/customer/orders/${orderId}/quotes/${quoteId}/decide`, payload);
}

export function getCustomerDevices() {
  return get('/api/v1/customer/devices');
}

export function createCustomerDevice(payload) {
  return post('/api/v1/customer/devices', payload);
}

export function getCustomerDeviceTypes() {
  return get('/api/v1/customer/device-types');
}

