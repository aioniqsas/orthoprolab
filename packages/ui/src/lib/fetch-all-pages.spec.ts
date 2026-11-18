import { describe, expect, it, vi } from "vitest";
import { fetchAllPages, MAX_PAGES } from "./fetch-all-pages";

describe("fetchAllPages", () => {
  it("keeps loading pages while the API reports more rows than it returned", async () => {
    const pages = [[1, 2], [3, 4], [5]];
    const load = vi.fn(async (page: number, size: number) => ({
      data: pages[page - 1] ?? [],
      total: 5,
    }));

    const rows = await fetchAllPages(load, 2);

    expect(rows).toEqual([1, 2, 3, 4, 5]);
    expect(load).toHaveBeenCalledTimes(3);
    expect(load).toHaveBeenCalledWith(1, 2);
    expect(load).toHaveBeenCalledWith(3, 2);
  });

  it("stops at the defensive page cap", async () => {
    const load = vi.fn(async (_page: number, size: number) => ({
      data: Array.from({ length: size }, (_, i) => i),
      total: 10_000,
    }));

    const rows = await fetchAllPages(load, 2);

    expect(load).toHaveBeenCalledTimes(MAX_PAGES);
    expect(rows).toHaveLength(MAX_PAGES * 2);
  });

  it("stops with the rows already read when a page fails", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ data: [1, 2], total: 4 })
      .mockResolvedValueOnce(null);

    await expect(fetchAllPages(load, 2)).resolves.toEqual([1, 2]);
  });

  it("returns an empty list when the first page fails", async () => {
    await expect(fetchAllPages(async () => null, 2)).resolves.toEqual([]);
  });
});
