export const DEFAULT_PAGE = 1;
export const DEFAULT_SIZE = 10;
export const MAX_SIZE = 100;

/** One page of a list plus the totals the client needs to page through it. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

/**
 * Normalizes the `page`/`size` query strings of a list endpoint: a missing or
 * invalid value falls back to the default, and a size above the cap is
 * clamped to it (never rejected).
 */
export function normalizePagination(
  page?: string | number,
  size?: string | number,
): { page: number; size: number; skip: number } {
  const pageNumber = Number(page);
  const sizeNumber = Number(size);
  const normalizedPage =
    Number.isInteger(pageNumber) && pageNumber >= 1 ? pageNumber : DEFAULT_PAGE;
  const requestedSize =
    Number.isInteger(sizeNumber) && sizeNumber >= 1
      ? sizeNumber
      : DEFAULT_SIZE;
  const normalizedSize = Math.min(requestedSize, MAX_SIZE);
  return {
    page: normalizedPage,
    size: normalizedSize,
    skip: (normalizedPage - 1) * normalizedSize,
  };
}

export function paginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  size: number,
): PaginatedResult<T> {
  return { data, total, page, size };
}
