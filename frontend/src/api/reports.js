import { get } from './client.js';

export function getReportsSummary() {
  return get('/api/v1/reports/summary');
}

export function getAllPayments(params = {}) {
  const query = new URLSearchParams();
  if (params.paymentMethod) query.set('paymentMethod', params.paymentMethod);
  const qs = query.toString();
  return get(`/api/v1/reports/payments${qs ? `?${qs}` : ''}`);
}

export function getAllWarranties(params = {}) {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  const qs = query.toString();
  return get(`/api/v1/reports/warranties${qs ? `?${qs}` : ''}`);
}

