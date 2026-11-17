import { get, patch, post } from './client.js';

export function getUsers(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.role) query.set('role', params.role);
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive));
  if (params.branchId) query.set('branchId', String(params.branchId));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return get(`/api/v1/users${qs ? `?${qs}` : ''}`);
}

export function getUser(id) {
  return get(`/api/v1/users/${id}`);
}

export function getRoles() {
  return get('/api/v1/users/roles');
}

export function createUser(payload) {
  return post('/api/v1/users', payload);
}

export function updateUser(id, payload) {
  return patch(`/api/v1/users/${id}`, payload);
}

