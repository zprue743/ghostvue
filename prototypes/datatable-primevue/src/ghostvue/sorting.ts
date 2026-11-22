import type { DataTableColumnDef, DataTableColumnSort } from './types'

function cellValue<TData>(
  row: TData,
  column: DataTableColumnDef<TData>,
  index: number,
): unknown {
  if (column.accessorFn) return column.accessorFn(row, index)
  if (column.accessorKey) return (row as Record<string, unknown>)[column.accessorKey]
  return undefined
}

function defaultCompare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
  return String(a).localeCompare(String(b))
}

export function sortRows<TData>(
  rows: readonly TData[],
  columns: DataTableColumnDef<TData>[],
  sorting: DataTableColumnSort[],
): TData[] {
  const sort = sorting[0]
  if (!sort) return [...rows]
  const column = columns.find((c) => c.id === sort.id)
  if (!column) return [...rows]
  const copy = [...rows]
  copy.sort((rowA, rowB) => {
    const cmp = column.sortFn
      ? column.sortFn(rowA, rowB, column.id)
      : defaultCompare(
          cellValue(rowA, column, 0),
          cellValue(rowB, column, 0),
        )
    return sort.desc ? -cmp : cmp
  })
  return copy
}