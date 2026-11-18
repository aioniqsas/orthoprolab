/** One page of an API list endpoint. */
export type ApiPage<T> = {
  data: T[];
  total: number;
};

/**
 * Hard cap of pages read when a caller needs the WHOLE list. Only for content
 * that is not a paginated table (static routes, marketing grids, form options).
 */
export const MAX_PAGES = 10;

/**
 * Reads every page an endpoint reports, with a defensive cap, and returns the
 * rows. A failed page (`null`) stops the sweep with the rows already read
 * instead of throwing.
 */
export async function fetchAllPages<T>(
  load: (page: number, size: number) => Promise<ApiPage<T> | null>,
  size = 100,
): Promise<T[]> {
  const data: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await load(page, size);
    if (!body) break;
    data.push(...body.data);
    if (body.data.length === 0 || data.length >= body.total) break;
  }
  return data;
}
