import { get, patch, post } from './client.js';

export function getWarehouses() {
  return get('/api/v1/inventory/warehouses');
}

export function getInventoryItems(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return get(`/api/v1/inventory/items${qs ? `?${qs}` : ''}`);
}

export function getInventoryItem(id) {
  return get(`/api/v1/inventory/items/${id}`);
}

export function createInventoryItem(payload) {
  return post('/api/v1/inventory/items', payload);
}

export function updateInventoryItem(id, payload) {
  return patch(`/api/v1/inventory/items/${id}`, payload);
}

export function getStocks(params = {}) {
  const query = new URLSearchParams();
  if (params.warehouseId) query.set('warehouseId', String(params.warehouseId));
  if (params.itemId) query.set('itemId', String(params.itemId));
  if (params.lowStock) query.set('lowStock', 'true');
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return get(`/api/v1/inventory/stocks${qs ? `?${qs}` : ''}`);
}

export function getStock(warehouseId, itemId) {
  return get(`/api/v1/inventory/stocks/${warehouseId}/${itemId}`);
}

export function getInventoryTransactions(params = {}) {
  const query = new URLSearchParams();
  if (params.warehouseId) query.set('warehouseId', String(params.warehouseId));
  if (params.inventoryItemId) query.set('inventoryItemId', String(params.inventoryItemId));
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return get(`/api/v1/inventory/transactions${qs ? `?${qs}` : ''}`);
}

export function createInventoryTransaction(payload) {
  return post('/api/v1/inventory/transactions', payload);
}

