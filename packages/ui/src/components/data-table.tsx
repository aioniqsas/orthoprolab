"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react"

import { Button } from "@repo/ui/components/button"
import { Input } from "@repo/ui/components/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table"
import { cn } from "@repo/ui/lib/utils"

export type DataTableColumn<T> = {
  id: string
  header: React.ReactNode
  render: (row: T) => React.ReactNode
  /** Plain text the global search matches against. */
  searchValue?: (row: T) => string
  /** Return a string or number to enable click-to-sort on this column. */
  sortValue?: (row: T) => string | number
  /** Whitelisted `sort` value of the server for this column (server mode). */
  sortKey?: string
  align?: "left" | "right"
  /** Cell classes; the header keeps its own typography. */
  className?: string
}

export type DataTableFilter<T> = {
  id: string
  label: string
  /** Label of the option that disables the filter. */
  allLabel?: string
  options: readonly { value: string; label: string }[]
  match: (row: T, value: string) => boolean
}

/**
 * Server pagination: the caller loads ONE page and the table only navigates.
 * Rows are rendered as they arrive; the counters and the page count come from
 * the server `total`, never from the size of the loaded page.
 *
 * Client-side filters and column sorting are disabled in this mode: filtering
 * or sorting a single page would silently give wrong results.
 */
/** A filter applied by the server: the table only renders the control. */
export type DataTableServerFilter = {
  id: string
  label: string
  allLabel?: string
  options: readonly { value: string; label: string }[]
  /** Current value; "all" means no filter. */
  value: string
  onChange: (value: string) => void
}

/** Server-side column sorting: one whitelisted `sort` key at a time. */
export type DataTableServerSort = {
  sort?: string
  order?: "asc" | "desc"
  onSort: (key: string) => void
}

export type DataTableServerPagination = {
  /** 1-based page currently shown. */
  page: number
  size: number
  total: number
  onPage: (page: number) => void
  onSize: (size: number) => void
  pageSizeOptions?: readonly number[]
}

export type DataTableProps<T> = {
  rows: readonly T[]
  columns: readonly DataTableColumn<T>[]
  rowKey: (row: T) => string
  search?: {
    placeholder: string
    label: string
  }
  /**
   * Search run by the server. `value` is the search last submitted; the user
   * types in the box and submits with the Buscar button or Enter, so only the
   * submitted text travels and the server searches with its indexes.
   */
  serverSearch?: {
    value: string
    onSearch: (text: string) => void
  }
  filters?: readonly DataTableFilter<T>[]
  /** Mobile rendering; the table itself is hidden below md. */
  renderCard?: (row: T) => React.ReactNode
  empty?: React.ReactNode
  pageSizeOptions?: readonly number[]
  initialPageSize?: number
  /** Initial sort applied on first render. */
  initialSort?: { id: string; dir: "asc" | "desc" }
  /** Filter values applied on first render, e.g. `{ grupo: "activas" }`. */
  initialFilterValues?: Record<string, string>
  /** Paginate on the server: one page per request, counters from `total`. */
  serverPagination?: DataTableServerPagination
  /** Filters applied by the server (only used with `serverPagination`). */
  serverFilters?: readonly DataTableServerFilter[]
  /** Column sorting applied by the server (only with `serverPagination`). */
  serverSort?: DataTableServerSort
}

const selectClass =
  "h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"

/** Lowercase and strip accents so searches ignore case and diacritics. */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
}

/** Rows matching the query and every active filter (AND). */
export function filterRows<T>(
  rows: readonly T[],
  columns: readonly DataTableColumn<T>[],
  filters: readonly DataTableFilter<T>[],
  filterValues: Record<string, string>,
  query: string,
): T[] {
  const needle = normalize(query)
  return rows.filter((row) => {
    if (needle) {
      const haystack = normalize(
        columns.map((column) => column.searchValue?.(row) ?? "").join(" "),
      )
      if (!haystack.includes(needle)) return false
    }
    return filters.every((filter) => {
      const value = filterValues[filter.id]
      if (!value || value === "all") return true
      return filter.match(row, value)
    })
  })
}

/**
 * Counters of one server page: 1-based current page, page count from the
 * server total and the 1-based range of rows being shown.
 */
export function serverPageWindow(page: number, size: number, total: number) {
  const safeSize = size > 0 ? size : 1
  const pageCount = Math.max(1, Math.ceil(total / safeSize))
  const currentPage = Math.max(1, Math.trunc(page))
  const first = total === 0 ? 0 : Math.min((currentPage - 1) * safeSize + 1, total)
  const last = total === 0 ? 0 : Math.min(currentPage * safeSize, total)
  return { currentPage, pageCount, first, last }
}

/** Page slice, clamped to the available range. */
export function paginate<T>(rows: readonly T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const first = currentPage * pageSize
  return {
    visible: rows.slice(first, first + pageSize),
    pageCount,
    currentPage,
    first,
  }
}

function DataTable<T>({
  rows,
  columns,
  rowKey,
  search,
  serverSearch,
  filters = [],
  renderCard,
  empty,
  pageSizeOptions = [10, 25, 50],
  initialPageSize = 10,
  initialSort,
  initialFilterValues,
  serverPagination,
  serverFilters = [],
  serverSort,
}: DataTableProps<T>) {
  const server = serverPagination
  const serverPageSize = server?.size ?? initialPageSize
  const sizeOptions = server?.pageSizeOptions ?? pageSizeOptions
  const [query, setQuery] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>(
    initialFilterValues ?? {},
  )
  const [page, setPage] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [sort, setSort] = React.useState<{ id: string; dir: "asc" | "desc" } | null>(initialSort ?? null)

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.id !== columnId) return { id: columnId, dir: "asc" }
      if (prev.dir === "asc") return { id: columnId, dir: "desc" }
      return null
    })
    setPage(0)
  }

  const busqueda = serverSearch ? serverSearch.value : query
  // Server search: what the user is typing, until submitted.
  const [borrador, setBorrador] = React.useState(serverSearch?.value ?? "")
  React.useEffect(() => {
    if (serverSearch) setBorrador(serverSearch.value)
    // Only when the submitted value changes from outside (e.g. cleared).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverSearch?.value])
  const filtered = filterRows(rows, columns, filters, filterValues, serverSearch ? "" : query)

  const sorted = React.useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.id === sort.id)
    if (!col?.sortValue) return filtered
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { sensitivity: "base" })
      return sort.dir === "asc" ? cmp : -cmp
    })
  }, [filtered, sort, columns])

  const localPage = paginate(sorted, page, pageSize)
  const serverWindow = server
    ? serverPageWindow(server.page, server.size, server.total)
    : null
  // A server page is rendered exactly as it arrived.
  const visible = server ? rows : localPage.visible
  const pageCount = serverWindow?.pageCount ?? localPage.pageCount
  const currentPage = serverWindow ? serverWindow.currentPage - 1 : localPage.currentPage
  const first = serverWindow ? serverWindow.first - 1 : localPage.first
  const totalRows = server ? server.total : filtered.length
  const lastRow = serverWindow
    ? serverWindow.last
    : Math.min(first + pageSize, filtered.length)

  const hasFilters =
    normalize(busqueda).length > 0 ||
    Object.values(filterValues).some((value) => value && value !== "all")

  const clearFilters = () => {
    setQuery("")
    setBorrador("")
    serverSearch?.onSearch("")
    setFilterValues({})
    setPage(0)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {search ? (
          serverSearch ? (
            <form
              role="search"
              className="flex min-w-56 flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(0)
                serverSearch.onSearch(borrador.trim())
              }}
            >
              <div className="relative flex-1">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  value={borrador}
                  onChange={(event) => setBorrador(event.target.value)}
                  aria-label={search.label}
                  placeholder={search.placeholder}
                  className="h-10 rounded-xl pl-8"
                />
              </div>
              <Button type="submit" variant="outline" className="h-10 rounded-xl">
                Buscar
              </Button>
            </form>
          ) : (
          <div className="relative min-w-56 flex-1">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={busqueda}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              aria-label={search.label}
              placeholder={search.placeholder}
              className="h-10 rounded-xl pl-8"
            />
          </div>
          )
        ) : null}
        {server
          ? serverFilters.map((filter) => (
              <label key={filter.id} className="flex items-center gap-2 text-sm">
                {filter.label}
                <select
                  aria-label={filter.label}
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                  className={selectClass}
                >
                  <option value="all">{filter.allLabel ?? "Todos"}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))
          : filters.map((filter) => (
          <label key={filter.id} className="flex items-center gap-2 text-sm">
            {filter.label}
            <select
              aria-label={filter.label}
              value={filterValues[filter.id] ?? "all"}
              onChange={(event) => {
                setFilterValues((previous) => ({ ...previous, [filter.id]: event.target.value }))
                setPage(0)
              }}
              className={selectClass}
            >
              <option value="all">{filter.allLabel ?? "Todos"}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
        {!server && hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {(server ? server.total === 0 : filtered.length === 0) ? (
        empty ?? null
      ) : (
        <>
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => {
                    const serverSorted = server
                      ? serverSort?.sort === column.sortKey
                      : false
                    const isSorted = server ? serverSorted : sort?.id === column.id
                    const direction = server ? serverSort?.order : sort?.dir
                    const SortIcon = isSorted
                      ? direction === "asc"
                        ? ChevronUpIcon
                        : ChevronDownIcon
                      : ChevronsUpDownIcon
                    return (
                      <TableHead
                        key={column.id}
                        className={cn(column.align === "right" && "text-end")}
                      >
                        {(server ? column.sortKey : column.sortValue) ? (
                          <button
                            type="button"
                            onClick={() =>
                              server
                                ? serverSort?.onSort(column.sortKey as string)
                                : toggleSort(column.id)
                            }
                            className="inline-flex cursor-pointer items-center gap-1 font-medium hover:text-foreground"
                          >
                            {column.header}
                            <SortIcon className={cn("size-3.5 shrink-0", isSorted ? "text-foreground" : "text-muted-foreground/50")} aria-hidden />
                          </button>
                        ) : (
                          column.header
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={rowKey(row)}>
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          column.align === "right" && "text-end tabular-nums",
                          column.className,
                        )}
                      >
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {renderCard ? (
            <ul className="flex flex-col gap-3 md:hidden">
              {visible.map((row) => (
                <React.Fragment key={rowKey(row)}>{renderCard(row)}</React.Fragment>
              ))}
            </ul>
          ) : null}
        </>
      )}

      {(server ? server.total > 0 : filtered.length > 0) ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p role="status">
            Mostrando {first + 1}–{lastRow} de {totalRows}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              Filas por página
              <select
                value={serverPageSize}
                onChange={(event) => {
                  const next = Number(event.target.value)
                  if (server) {
                    server.onSize(next)
                    return
                  }
                  setPageSize(next)
                  setPage(0)
                }}
                className={selectClass}
              >
                {sizeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage === 0}
              onClick={() =>
                server ? server.onPage(currentPage) : setPage(currentPage - 1)
              }
            >
              <ChevronLeftIcon aria-hidden /> Anterior
            </Button>
            <span className="tabular-nums">
              Página {currentPage + 1} de {pageCount}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={currentPage >= pageCount - 1}
              onClick={() =>
                server ? server.onPage(currentPage + 2) : setPage(currentPage + 1)
              }
            >
              Siguiente <ChevronRightIcon aria-hidden />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export { DataTable }
