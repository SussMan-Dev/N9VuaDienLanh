import { get, post, patch } from './client';

export function listPartsRequests(params?: { repairOrderId?: number; status?: string }) {
  return get('/api/v1/parts-requests', params);
}

export function createPartsRequest(body: {
  repairOrderId: number;
  warehouseId?: number;
  notes?: string;
  items: Array<{
    inventoryItemId: number;
    quantityRequested: number;
    notes?: string;
  }>;
}) {
  return post('/api/v1/parts-requests', body);
}

export function approvePartsRequest(id: number, notes?: string) {
  return patch(`/api/v1/parts-requests/${id}/approve`, { notes });
}

export function rejectPartsRequest(id: number, reason: string) {
  return patch(`/api/v1/parts-requests/${id}/reject`, { reason });
}

export function issuePartsRequest(id: number) {
  return post(`/api/v1/parts-requests/${id}/issue`);
}
