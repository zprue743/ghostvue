import type { DataTableColumnDef, DataTableColumnFilter } from './types'

export function isFilterClear(value: unknown): boolean {
  return value === undefined || value === null || value === ''
}

function cellValue<TData>(
  row: TData,
  column: DataTableColumnDef<TData>,
  index: number,
): unknown {
  if (column.accessorFn) return column.accessorFn(row, index)
  if (column.accessorKey) return (row as Record<string, unknown>)[column.accessorKey]
  return undefined
}

function columnParticipatesInGlobal<TData>(column: DataTableColumnDef<TData>): boolean {
  const hasAccessor = Boolean(column.accessorKey || column.accessorFn)
  if (!hasAccessor) return false
  return column.enableColumnFilter !== false
}

function matchesGlobalFilter<TData>(
  row: TData,
  columns: DataTableColumnDef<TData>[],
  globalFilter: unknown,
  rowIndex: number,
): boolean {
  if (isFilterClear(globalFilter)) return true
  const participating = columns.filter(columnParticipatesInGlobal)
  for (const column of participating) {
    const value = cellValue(row, column, rowIndex)
    if (value === null || value === undefined) continue
    if (typeof globalFilter === 'string') {
      if (String(value).toLowerCase().includes(globalFilter.toLowerCase())) return true
    } else if (value === globalFilter) {
      return true
    }
  }
  return false
}

function matchesColumnFilter<TData>(
  row: TData,
  column: DataTableColumnDef<TData>,
  filterValue: unknown,
  rowIndex: number,
): boolean {
  if (isFilterClear(filterValue)) return true
  const value = cellValue(row, column, rowIndex)
  if (column.filterFn) {
    return column.filterFn(row, column.id, filterValue)
  }
  if (value === null || value === undefined) return false
  if (typeof filterValue === 'string') {
    return String(value).toLowerCase().includes(filterValue.toLowerCase())
  }
  return value === filterValue
}

export function filterRows<TData>(
  rows: readonly TData[],
  columns: DataTableColumnDef<TData>[],
  globalFilter: unknown,
  columnFilters: DataTableColumnFilter[],
): TData[] {
  const activeColumnFilters = columnFilters.filter((f) => !isFilterClear(f.value))
  return rows.filter((row, rowIndex) => {
    if (!matchesGlobalFilter(row, columns, globalFilter, rowIndex)) return false
    for (const filter of activeColumnFilters) {
      const column = columns.find((c) => c.id === filter.id)
      if (!column) continue
      if (!matchesColumnFilter(row, column, filter.value, rowIndex)) return false
    }
    return true
  })
}