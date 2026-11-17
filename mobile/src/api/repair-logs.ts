import { get, post } from './client';

export function listRepairLogs(orderId: number) {
  return get(`/api/v1/repair-orders/${orderId}/logs`);
}

export function createRepairLog(
  orderId: number,
  body: {
    workPerformed: string;
    diagnosticDetails?: string;
    imagesBefore?: string[];
    imagesAfter?: string[];
  }
) {
  return post(`/api/v1/repair-orders/${orderId}/logs`, body);
}
