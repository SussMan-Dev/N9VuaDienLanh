import { get, patch, post } from './client.js';

export function getCustomers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.includeInactive !== undefined) query.set('includeInactive', String(params.includeInactive));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return get(`/api/v1/customers${qs ? `?${qs}` : ''}`);
}

export function getCustomer(id) {
  return get(`/api/v1/customers/${id}`);
}

export function createCustomer(payload) {
  const body = {
    fullName: payload.fullName,
    phone: payload.phone || payload.phoneNumber,
    email: payload.email,
    addressLine: payload.addressLine || payload.address,
    notes: payload.notes,
  };
  if (payload.username) body.username = payload.username;
  if (payload.password) body.password = payload.password;
  return post('/api/v1/customers', body);
}

export function updateCustomer(id, payload) {
  return patch(`/api/v1/customers/${id}`, payload);
}

export function setCustomerAccount(id, payload) {
  return post(`/api/v1/customers/${id}/account`, payload);
}
