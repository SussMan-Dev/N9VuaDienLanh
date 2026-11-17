/**
 * Format số tiền VNĐ cho React Native.
 * Dùng Intl.NumberFormat (hỗ trợ trong Hermes engine từ v0.72+).
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}
