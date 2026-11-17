import { AppError } from './app-error.js';
export function requireObject(body) { if (!body || typeof body !== 'object' || Array.isArray(body)) throw new AppError(422, 'VALIDATION_ERROR', 'A JSON object is required'); }
export function string(value, field, { required = false, min = 0, max = 255 } = {}) { if (value === undefined || value === null || value === '') { if (required) throw new AppError(422, 'VALIDATION_ERROR', `${field} is required`); return null; } if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new AppError(422, 'VALIDATION_ERROR', `${field} must be ${min}-${max} characters`); return value.trim(); }
export function optionalDate(value, field) { if (value === undefined || value === null || value === '') return null; if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw new AppError(422, 'VALIDATION_ERROR', `${field} must be YYYY-MM-DD`); return value; }
export function optionalDateTime(value, field) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new AppError(422, 'VALIDATION_ERROR', `${field} must be a valid date or datetime string`);
  const trimmed = value.trim();
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new AppError(422, 'VALIDATION_ERROR', `${field} must be a valid date or datetime`);
  const normalized = trimmed.replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return `${normalized} 09:00:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) return `${normalized}:00`;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(normalized)) return normalized.slice(0, 19);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}
export function optionalBoolean(value, field) { if (value === undefined) return undefined; if (typeof value !== 'boolean') throw new AppError(422, 'VALIDATION_ERROR', `${field} must be boolean`); return value; }
export function positiveId(value, field) { const parsed = Number(value); if (!Number.isSafeInteger(parsed) || parsed < 1) throw new AppError(422, 'VALIDATION_ERROR', `${field} must be a positive integer`); return parsed; }
