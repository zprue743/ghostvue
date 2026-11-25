import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTableColumnSort,
  DataTableRow,
} from './ghost-data-table'

/*
 * Pure local-processing stages for useGhostDataTable. Kept framework-free so
 * the composable can memoize each stage in its own computed and the stages can
 * be reasoned about (and benchmarked) without Vue.
 */

export function hasAccessor<TData>(column: DataTableColumnDef<TData>): boolean {
  return column.accessorKey !== undefined || column.accessorFn !== undefined
}

export function getCellValue<TData>(
  column: DataTableColumnDef<TData>,
  row: TData,
  rowIndex: number,
): unknown {
  if (column.accessorFn) return column.accessorFn(row, rowIndex)
  if (column.accessorKey !== undefined) return row[column.accessorKey]
  return undefined
}

/** Sorting needs a value source: an accessor or a column `sortFn`. */
export function isColumnSortable<TData>(
  column: DataTableColumnDef<TData>,
): boolean {
  return (
    column.enableSorting !== false &&
    (column.sortFn !== undefined || hasAccessor(column))
  )
}

/**
 * Global-filter participation (default filtering contract): the column has an
 * accessor and `enableColumnFilter !== false`. The global filter never calls
 * `filterFn`; that predicate only serves the column's own filter entry.
 */
export function participatesInGlobalFilter<TData>(
  column: DataTableColumnDef<TData>,
): boolean {
  return column.enableColumnFilter !== false && hasAccessor(column)
}

/** `undefined`, `null`, and `''` clear a global or column filter. */
export function isActiveFilterValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ''
}

const isMissing = (value: unknown): value is null | undefined =>
  value === null || value === undefined

// One shared collator: `localeCompare` without a cached collator re-resolves
// the locale per comparison, which dominates 10k-row sorts. Default locale
// matches `String#localeCompare`; SSR and client locales can still differ.
let collator: Intl.Collator | undefined
function getCollator(): Intl.Collator {
  collator ??= new Intl.Collator()
  return collator
}

/**
 * Default comparator for present (non-null) values: numeric subtract,
 * `Date#getTime`, locale-aware strings; mixed types compare as strings.
 */
export function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') {
    const delta = a - b
    // NaN would make the comparator inconsistent and the sort order arbitrary.
    return Number.isNaN(delta) ? 0 : delta
  }
  if (a instanceof Date && b instanceof Date) {
    const delta = a.getTime() - b.getTime()
    return Number.isNaN(delta) ? 0 : delta
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b)
  }
  if (typeof a === 'bigint' && typeof b === 'bigint') {
    return a < b ? -1 : a > b ? 1 : 0
  }
  return getCollator().compare(String(a), String(b))
}

/**
 * Stable single-column sort. Returns `rows` itself when there is nothing to
 * sort so downstream computeds keep their reference. `null` and `undefined`
 * are both treated as missing for `sortUndefined` (the filtering contract
 * treats them alike too). `'first'` / `'last'` are absolute positions that do
 * not flip with `desc`; `false` compares missing values as the smallest value.
 */
export function sortRows<TData>(
  rows: readonly DataTableRow<TData>[],
  sort: DataTableColumnSort | undefined,
  column: DataTableColumnDef<TData> | undefined,
): readonly DataTableRow<TData>[] {
  if (!sort || !column || !isColumnSortable(column) || rows.length < 2) {
    return rows
  }

  const direction = sort.desc ? -1 : 1
  const sortUndefined = column.sortUndefined ?? 'last'
  const withAccessor = hasAccessor(column)
  const { sortFn } = column

  // Decorate once so accessors run O(n) times instead of O(n log n).
  const decorated = rows.map((entry) => ({
    entry,
    value: withAccessor
      ? getCellValue(column, entry.row, entry.rowIndex)
      : undefined,
  }))

  decorated.sort((left, right) => {
    if (withAccessor) {
      const leftMissing = isMissing(left.value)
      const rightMissing = isMissing(right.value)
      if (leftMissing || rightMissing) {
        if (leftMissing && rightMissing) return 0
        if (sortUndefined === 'first') return leftMissing ? -1 : 1
        if (sortUndefined === 'last') return leftMissing ? 1 : -1
        if (!sortFn) return (leftMissing ? -1 : 1) * direction
      }
    }
    const result = sortFn
      ? sortFn(left.entry.row, right.entry.row, column.id)
      : compareValues(left.value, right.value)
    return result * direction
  })

  return decorated.map(({ entry }) => entry)
}

function matchesText(cellValue: unknown, needle: string): boolean {
  return String(cellValue).toLowerCase().includes(needle)
}

interface CompiledFilter<TData> {
  column: DataTableColumnDef<TData>
  test: (entry: DataTableRow<TData>) => boolean
}

function compileColumnFilter<TData>(
  column: DataTableColumnDef<TData>,
  filterValue: unknown,
): CompiledFilter<TData> {
  const { filterFn } = column
  if (filterFn) {
    return {
      column,
      test: (entry) => filterFn(entry.row, column.id, filterValue),
    }
  }
  if (typeof filterValue === 'string') {
    const needle = filterValue.toLowerCase()
    return {
      column,
      test: (entry) => {
        const value = getCellValue(column, entry.row, entry.rowIndex)
        return !isMissing(value) && matchesText(value, needle)
      },
    }
  }
  return {
    column,
    test: (entry) => {
      const value = getCellValue(column, entry.row, entry.rowIndex)
      return !isMissing(value) && value === filterValue
    },
  }
}

/**
 * Default filtering contract (approved, DataTable spec): global filter first
 * (OR across participating columns), then active column filters (AND).
 * Returns `rows` itself when no filter is active.
 */
export function filterRows<TData>(
  rows: readonly DataTableRow<TData>[],
  columns: readonly DataTableColumnDef<TData>[],
  columnsById: ReadonlyMap<string, DataTableColumnDef<TData>>,
  globalFilter: unknown,
  columnFilters: readonly DataTableColumnFilter[],
): readonly DataTableRow<TData>[] {
  const globalTest = compileGlobalFilter(columns, globalFilter)

  const columnTests: CompiledFilter<TData>[] = []
  for (const filter of columnFilters) {
    if (!isActiveFilterValue(filter.value)) continue
    const column = columnsById.get(filter.id)
    // Unknown ids, opted-out columns, and columns with neither an accessor nor
    // a filterFn cannot be evaluated; treat them as inactive instead of
    // hiding every row.
    if (!column || column.enableColumnFilter === false) continue
    if (!column.filterFn && !hasAccessor(column)) continue
    columnTests.push(compileColumnFilter(column, filter.value))
  }

  if (!globalTest && columnTests.length === 0) return rows

  return rows.filter(
    (entry) =>
      (!globalTest || globalTest(entry)) &&
      columnTests.every((filter) => filter.test(entry)),
  )
}

function compileGlobalFilter<TData>(
  columns: readonly DataTableColumnDef<TData>[],
  globalFilter: unknown,
): ((entry: DataTableRow<TData>) => boolean) | undefined {
  if (!isActiveFilterValue(globalFilter)) return undefined
  const participating = columns.filter(participatesInGlobalFilter)
  const matches =
    typeof globalFilter === 'string'
      ? (
          (needle: string) => (value: unknown) =>
            matchesText(value, needle)
        )(globalFilter.toLowerCase())
      : (value: unknown) => value === globalFilter

  return (entry) =>
    participating.some((column) => {
      const value = getCellValue(column, entry.row, entry.rowIndex)
      // Skip missing cells: String(undefined) would otherwise match 'un'.
      return !isMissing(value) && matches(value)
    })
}
