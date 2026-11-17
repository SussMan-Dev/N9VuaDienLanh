import { get } from './client';

export function listInventoryItems(params?: { search?: string; limit?: number; offset?: number }) {
  return get('/api/v1/inventory/items', params);
}

export function getInventoryItem(id: number) {
  return get(`/api/v1/inventory/items/${id}`);
}
