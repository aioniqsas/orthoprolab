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

export type DataTableProps<T> = {
  rows: readonly T[]
  columns: readonly DataTableColumn<T>[]
  rowKey: (row: T) => string
  search?: {
    placeholder: string
    label: string
  }
  filters?: readonly DataTableFilter<T>[]
  /** Mobile rendering; the table itself is hidden below md. */
  renderCard?: (row: T) => React.ReactNode
  empty?: React.ReactNode
  pageSizeOptions?: readonly number[]
  initialPageSize?: number
  /** Initial sort applied on first render. */
  initialSort?: { id: string; dir: "asc" | "desc" }
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
  filters = [],
  renderCard,
  empty,
  pageSizeOptions = [10, 25, 50],
  initialPageSize = 10,
  initialSort,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("")
  const [filterValues, setFilterValues] = React.useState<Record<string, string>>({})
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

  const filtered = filterRows(rows, columns, filters, filterValues, query)

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

  const { visible, pageCount, currentPage, first } = paginate(sorted, page, pageSize)

  const hasFilters =
    normalize(query).length > 0 ||
    Object.values(filterValues).some((value) => value && value !== "all")

  const clearFilters = () => {
    setQuery("")
    setFilterValues({})
    setPage(0)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {search ? (
          <div className="relative min-w-56 flex-1">
            <SearchIcon
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              aria-label={search.label}
              placeholder={search.placeholder}
              className="h-10 rounded-xl pl-8"
            />
          </div>
        ) : null}
        {filters.map((filter) => (
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
        {hasFilters ? (
          <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        empty ?? null
      ) : (
        <>
          <div className="hidden rounded-xl border border-border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => {
                    const isSorted = sort?.id === column.id
                    const SortIcon = isSorted
                      ? sort!.dir === "asc"
                        ? ChevronUpIcon
                        : ChevronDownIcon
                      : ChevronsUpDownIcon
                    return (
                      <TableHead
                        key={column.id}
                        className={cn(column.align === "right" && "text-end")}
                      >
                        {column.sortValue ? (
                          <button
                            type="button"
                            onClick={() => toggleSort(column.id)}
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

      {filtered.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p role="status">
            Mostrando {first + 1}–{Math.min(first + pageSize, filtered.length)} de {filtered.length}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2">
              Filas por página
              <select
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value))
                  setPage(0)
                }}
                className={selectClass}
              >
                {pageSizeOptions.map((option) => (
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
              onClick={() => setPage(currentPage - 1)}
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
              onClick={() => setPage(currentPage + 1)}
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
