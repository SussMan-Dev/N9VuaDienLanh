import { get, post } from './client';

export function getMyOrders() {
  return get('/api/v1/customer/orders');
}

export function getMyOrderDetail(id: number) {
  return get(`/api/v1/customer/orders/${id}`);
}

export function customerDecideQuote(
  orderId: number,
  quoteId: number,
  decision: 'APPROVED' | 'REJECTED',
  note?: string
) {
  return post(`/api/v1/customer/orders/${orderId}/quotes/${quoteId}/decide`, {
    decision,
    note,
  });
}

export function getMyWarranties() {
  return get('/api/v1/customer/warranties');
}

export function getMyDevices() {
  return get('/api/v1/customer/devices');
}

export function getDeviceTypes() {
  return get('/api/v1/customer/device-types');
}

export function createServiceRequest(body: {
  deviceId?: number;
  deviceTypeId?: number;
  brand?: string;
  model?: string;
  serialNumber?: string;
  issueDescription: string;
  contactPhone?: string;
  addressLine?: string;
  preferredDatetime?: string;
  images?: string[];
}) {
  return post('/api/v1/customer/service-requests', body);
}
