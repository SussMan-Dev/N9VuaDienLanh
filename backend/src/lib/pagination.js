import { AppError } from './app-error.js';
export function parseListQuery(query, allowedSorts, defaultSort) {
  const page = Number.parseInt(query.page ?? '1', 10);
  const pageSize = Number.parseInt(query.pageSize ?? query.limit ?? '20', 10);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new AppError(422, 'VALIDATION_ERROR', 'page must be >= 1 and pageSize must be 1-100');
  const sortBy = query.sortBy ?? defaultSort;
  if (!allowedSorts.includes(sortBy)) throw new AppError(422, 'VALIDATION_ERROR', 'Invalid sortBy');
  const sortOrder = (query.sortOrder ?? 'asc').toLowerCase();
  if (!['asc', 'desc'].includes(sortOrder)) throw new AppError(422, 'VALIDATION_ERROR', 'sortOrder must be asc or desc');
  return { page, pageSize, offset: (page - 1) * pageSize, sortBy, sortOrder: sortOrder.toUpperCase() };
}
export function listResponse(items, total, page, pageSize) { return { items, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } }; }
