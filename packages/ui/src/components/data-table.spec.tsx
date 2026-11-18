import { describe, expect, it } from "vitest"

import { filterRows, paginate, serverPageWindow } from "./data-table"
import type { DataTableColumn, DataTableFilter } from "./data-table"

type Row = { id: string; nombre: string; activo: boolean }

const ROWS: Row[] = [
  { id: "1", nombre: "Alineadores Invisibles", activo: true },
  { id: "2", nombre: "Ortodoncia Fija", activo: true },
  { id: "3", nombre: "Ortodoncia Removible", activo: false },
]

const columns: DataTableColumn<Row>[] = [
  { id: "id", header: "Id", render: (r) => r.id, searchValue: (r) => r.id },
  { id: "nombre", header: "Nombre", render: (r) => r.nombre, searchValue: (r) => r.nombre },
]

const filters: DataTableFilter<Row>[] = [
  {
    id: "activo",
    label: "Estado",
    options: [
      { value: "1", label: "Activos" },
      { value: "0", label: "Inactivos" },
    ],
    match: (r, value) => r.activo === (value === "1"),
  },
]

describe("filterRows", () => {
  it("matches the query ignoring case and accents", () => {
    expect(filterRows(ROWS, columns, filters, {}, "removible")).toHaveLength(1)
    expect(filterRows(ROWS, columns, filters, {}, "REMOVIBLE")).toHaveLength(1)
    expect(filterRows(ROWS, columns, filters, {}, "ortodoncia")).toHaveLength(2)
  })

  it("returns every row without a query", () => {
    expect(filterRows(ROWS, columns, filters, {}, "")).toHaveLength(3)
  })

  it("combines the query with the filters", () => {
    expect(filterRows(ROWS, columns, filters, { activo: "1" }, "ortodoncia")).toHaveLength(1)
    expect(filterRows(ROWS, columns, filters, { activo: "0" }, "ortodoncia")).toHaveLength(1)
    expect(filterRows(ROWS, columns, filters, { activo: "1" }, "removible")).toHaveLength(0)
  })

  it("ignores the filters that are not active", () => {
    expect(filterRows(ROWS, columns, filters, { activo: "all" }, "")).toHaveLength(3)
  })
})

describe("paginate", () => {
  it("slices the requested page", () => {
    const page = paginate(ROWS, 1, 2)
    expect(page.visible.map((r) => r.id)).toEqual(["3"])
    expect(page.pageCount).toBe(2)
    expect(page.currentPage).toBe(1)
    expect(page.first).toBe(2)
  })

  it("clamps a page beyond the last one", () => {
    const page = paginate(ROWS, 9, 2)
    expect(page.currentPage).toBe(1)
    expect(page.visible.map((r) => r.id)).toEqual(["3"])
  })

  it("keeps a single page when there are no rows", () => {
    const page = paginate([], 0, 10)
    expect(page.pageCount).toBe(1)
    expect(page.visible).toEqual([])
  })
})

describe("serverPageWindow", () => {
  it("counts the pages from the server total, not from the loaded rows", () => {
    expect(serverPageWindow(2, 10, 35)).toEqual({
      currentPage: 2,
      pageCount: 4,
      first: 11,
      last: 20,
    })
  })

  it("shows the last partial page", () => {
    expect(serverPageWindow(4, 10, 35)).toEqual({
      currentPage: 4,
      pageCount: 4,
      first: 31,
      last: 35,
    })
  })

  it("reports no rows when the server total is zero", () => {
    expect(serverPageWindow(1, 10, 0)).toEqual({
      currentPage: 1,
      pageCount: 1,
      first: 0,
      last: 0,
    })
  })

  it("keeps a page beyond the end as requested, with the total as the counter", () => {
    expect(serverPageWindow(9, 10, 35)).toEqual({
      currentPage: 9,
      pageCount: 4,
      first: 35,
      last: 35,
    })
  })
})
