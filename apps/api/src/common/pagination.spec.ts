import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PAGE,
  DEFAULT_SIZE,
  MAX_SIZE,
  normalizePagination,
  paginatedResult,
} from './pagination.js';

describe('normalizePagination', () => {
  it('falls back to the defaults when no page or size is given', () => {
    expect(normalizePagination()).toEqual({
      page: DEFAULT_PAGE,
      size: DEFAULT_SIZE,
      skip: 0,
    });
    // The product default is 10 rows per page; the cap stays at 100.
    expect(DEFAULT_SIZE).toBe(10);
    expect(MAX_SIZE).toBe(100);
  });

  it('clamps a size above the cap to the cap', () => {
    const page = normalizePagination('1', String(MAX_SIZE + 50));
    expect(page.size).toBe(MAX_SIZE);
    expect(page.skip).toBe(0);
  });

  it('computes the offset of a later page', () => {
    expect(normalizePagination('3', '10')).toEqual({
      page: 3,
      size: 10,
      skip: 20,
    });
  });

  it('keeps a page beyond the end as requested, with its offset', () => {
    expect(normalizePagination('9', '20')).toEqual({
      page: 9,
      size: 20,
      skip: 160,
    });
  });

  it('falls back to the defaults for invalid pages and sizes', () => {
    expect(normalizePagination('0', '5').page).toBe(DEFAULT_PAGE);
    expect(normalizePagination('abc', '5').page).toBe(DEFAULT_PAGE);
    expect(normalizePagination('1', '0').size).toBe(DEFAULT_SIZE);
    expect(normalizePagination('1', 'abc').size).toBe(DEFAULT_SIZE);
    expect(normalizePagination('1', '2.5').size).toBe(DEFAULT_SIZE);
  });
});

describe('paginatedResult', () => {
  it('keeps the correct total with empty data for a page beyond the end', () => {
    expect(paginatedResult([], 7, 9, 20)).toEqual({
      data: [],
      total: 7,
      page: 9,
      size: 20,
    });
  });
});
