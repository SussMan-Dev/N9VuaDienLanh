import { get, post, patch } from './client';

export function listRepairOrders(params?: {
  status?: string;
  repairStatus?: string;
  limit?: number;
  offset?: number;
  search?: string;
  assignedTechnicianId?: number;
}) {
  const query: any = { ...params };
  if (query.status && !query.repairStatus) {
    query.repairStatus = query.status;
  }
  return get('/api/v1/repair-orders', query);
}

export function getRepairOrder(id: number) {
  return get(`/api/v1/repair-orders/${id}`);
}

export function transitionStatus(id: number, toStatus: string, reason?: string) {
  return post(`/api/v1/repair-orders/${id}/status-transitions`, { toStatus, reason });
}

export function getBillingSummary(id: number) {
  return get(`/api/v1/repair-orders/${id}/billing`);
}

export function listPayments(id: number) {
  return get(`/api/v1/repair-orders/${id}/payments`);
}

export function listQuotes(id: number) {
  return get(`/api/v1/repair-orders/${id}/quotes`);
}

export function adminApproveQuote(orderId: number, quoteId: number, decision: 'APPROVED' | 'REJECTED', note: string) {
  return post(`/api/v1/repair-orders/${orderId}/quotes/${quoteId}/admin-approval`, { decision, note });
}

export function customerDecideQuote(orderId: number, quoteId: number, decision: 'APPROVED' | 'REJECTED', customerContactName?: string, note?: string) {
  return post(`/api/v1/repair-orders/${orderId}/quotes/${quoteId}/decisions`, { decision, customerContactName, note });
}

export function listAssignments(id: number) {
  return get(`/api/v1/repair-orders/${id}/assignments`);
}

export function createDiagnostic(id: number, body: { diagnosisText: string; recommendedAction?: string; estimatedLabor?: number }) {
  return post(`/api/v1/repair-orders/${id}/diagnostics`, body);
}

export function listDiagnostics(id: number) {
  return get(`/api/v1/repair-orders/${id}/diagnostics`);
}

export function createQuote(id: number, body: {
  diagnosticId?: number;
  laborAmount?: number;
  partsAmount?: number;
  taxAmount?: number;
  discountAmount?: number;
  isSupplemental?: boolean;
  notes?: string;
  items?: Array<{
    itemType: 'LABOR' | 'PART';
    description: string;
    quantity: number;
    unitPrice: number;
    inventoryItemId?: number;
  }>;
}) {
  return post(`/api/v1/repair-orders/${id}/quotes`, body);
}

export function createPayment(id: number, body: {
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'CREDIT_CARD';
  notes?: string;
}) {
  return post(`/api/v1/repair-orders/${id}/payments`, body);
}

export function assignTechnician(id: number, technicianUserId: number, notes?: string) {
  return post(`/api/v1/repair-orders/${id}/assignments`, { technicianUserId, notes });
}

export function listTechnicians() {
  return get('/api/v1/technicians');
}

