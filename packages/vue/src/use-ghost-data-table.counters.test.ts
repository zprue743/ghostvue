import { effectScope, ref, type Ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as Processing from './data-table-processing'
import { filterRows, sortRows } from './data-table-processing'
import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTableColumnSort,
  DataTablePaginationState,
  DataTableRowId,
  UseGhostDataTableOptions,
  UseGhostDataTableReturn,
} from './ghost-data-table'
import { useGhostDataTable } from './use-ghost-data-table'

/*
 * GHO-240: deterministic regression counters from the DataTable spec
 * (§Performance). These are correctness guards, not timing thresholds, so they
 * run in the normal unit suite; the informational timing bench lives in
 * `tests/bench/data-table-processing.bench.ts`.
 *
 * The spies wrap the real processing stages (behavior is unchanged) and count
 * whole sort / filter passes. That covers the default comparator and the
 * default filtering contract, which never call a consumer `sortFn` /
 * `filterFn` and so cannot be observed through column callbacks alone (the
 * callback-level counters live in `use-ghost-data-table.test.ts`).
 */
vi.mock('./data-table-processing', async (importOriginal) => {
  const actual = await importOriginal<typeof Processing>()
  return {
    ...actual,
    sortRows: vi.fn(actual.sortRows),
    filterRows: vi.fn(actual.filterRows),
  }
})

const sortPasses = vi.mocked(sortRows)
const filterPasses = vi.mocked(filterRows)

interface Invoice {
  id: string
  customer: string
  amount: number
  status: 'paid' | 'open'
}

// Default comparator and default filtering only: no sortFn / filterFn.
const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', accessorKey: 'customer' },
  { id: 'amount', accessorKey: 'amount' },
  { id: 'status', accessorKey: 'status' },
]

const getRowId = (row: Invoice): string => row.id

function invoices(count: number): Invoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `inv-${String(index + 1)}`,
    customer: `Customer ${String((index * 7919) % count)}`,
    // Scrambled so an ascending sort really reorders the source.
    amount: (index * 7919) % count,
    status: index % 3 === 0 ? 'paid' : 'open',
  }))
}

const scopes: ReturnType<typeof effectScope>[] = []

function setup(
  options: UseGhostDataTableOptions<Invoice>,
): UseGhostDataTableReturn<Invoice> {
  const scope = effectScope()
  scopes.push(scope)
  const table = scope.run(() => useGhostDataTable(options))
  if (!table) throw new Error('useGhostDataTable did not run')
  return table
}

/** Pass counts since the last `snapshot()`; reading the model first forces
 * the lazy computeds so the next action is measured on its own. */
function counter(table: UseGhostDataTableReturn<Invoice>) {
  let sortBase = 0
  let filterBase = 0
  return {
    snapshot(): void {
      table.getRowModel()
      void table.headerSelectionState.value
      sortBase = sortPasses.mock.calls.length
      filterBase = filterPasses.mock.calls.length
    },
    passes(): { sort: number; filter: number } {
      table.getRowModel()
      void table.headerSelectionState.value
      table.getSelectedRowModel()
      return {
        sort: sortPasses.mock.calls.length - sortBase,
        filter: filterPasses.mock.calls.length - filterBase,
      }
    },
  }
}

const amounts = (table: UseGhostDataTableReturn<Invoice>): number[] =>
  table.getRowModel().map((entry) => entry.row.amount)

beforeEach(() => {
  sortPasses.mockClear()
  filterPasses.mockClear()
})

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
})

describe('useGhostDataTable regression counters: paging', () => {
  it('page change after a local sort runs zero additional sort or filter passes', () => {
    const table = setup({
      data: invoices(10_000),
      columns,
      getRowId,
      defaultSorting: [{ id: 'amount', desc: false }],
      defaultColumnFilters: [{ id: 'status', value: 'open' }],
      defaultPagination: { pageIndex: 1, pageSize: 25 },
    })
    const count = counter(table)
    count.snapshot()
    expect(sortPasses).toHaveBeenCalledTimes(1)

    const firstPage = amounts(table)
    table.setPageIndex(2)
    const secondPage = amounts(table)
    table.setPageIndex(table.pageCount.value)
    table.getRowModel()
    table.setPageIndex(1)

    // Paging still produced the right, globally sorted slices.
    expect(firstPage).toHaveLength(25)
    expect(secondPage[0]).toBeGreaterThan(firstPage.at(-1) ?? Infinity)
    expect(amounts(table)).toEqual(firstPage)
    expect(count.passes()).toEqual({ sort: 0, filter: 0 })
  })

  it('page size change re-slices without re-sorting or re-filtering', () => {
    const table = setup({
      data: invoices(1000),
      columns,
      getRowId,
      defaultSorting: [{ id: 'customer', desc: true }],
      defaultGlobalFilter: 'customer 1',
      defaultPagination: { pageIndex: 3, pageSize: 10 },
    })
    const count = counter(table)
    count.snapshot()

    table.setPageSize(50)
    expect(table.getRowModel()).toHaveLength(50)
    expect(table.pagination.value).toEqual({ pageIndex: 1, pageSize: 50 })
    expect(count.passes()).toEqual({ sort: 0, filter: 0 })
  })

  it('controlled pagination writes from the parent do not re-sort', () => {
    // Mirrors `v-model:pagination` / `v-model:sorting`: the parent owns the
    // refs and echoes every change back.
    const sorting = ref<DataTableColumnSort[]>([{ id: 'amount', desc: true }])
    const pagination = ref<DataTablePaginationState>({
      pageIndex: 1,
      pageSize: 25,
    })
    const table = setup({
      data: invoices(5000),
      columns,
      getRowId,
      sorting,
      pagination,
      onSortingChange: (next) => (sorting.value = next),
      onPaginationChange: (next) => (pagination.value = next),
    })
    const count = counter(table)
    count.snapshot()

    table.setPageIndex(4)
    expect(pagination.value.pageIndex).toBe(4)
    pagination.value = { pageIndex: 7, pageSize: 25 }
    expect(table.pagination.value.pageIndex).toBe(7)
    expect(amounts(table)[0]).toBe(5000 - 1 - 6 * 25)
    expect(count.passes()).toEqual({ sort: 0, filter: 0 })
  })
})

/** The local-mode options the selection cases vary. */
interface SelectionExtras {
  defaultSorting?: DataTableColumnSort[]
  defaultColumnFilters?: DataTableColumnFilter[]
  defaultGlobalFilter?: string
  selectedRowIds?: Ref<DataTableRowId[]>
  onSelectedRowIdsChange?: (next: DataTableRowId[]) => void
}

describe('useGhostDataTable regression counters: selection and expansion', () => {
  function selectionTable(
    extra: SelectionExtras = {},
  ): UseGhostDataTableReturn<Invoice> {
    return setup({
      data: invoices(1000),
      columns,
      getRowId,
      enableRowSelection: true,
      enableRowExpansion: true,
      defaultPagination: { pageIndex: 2, pageSize: 25 },
      ...extra,
    })
  }

  function exerciseSelection(table: UseGhostDataTableReturn<Invoice>): void {
    const visible = table.getRowModel()
    const first = visible[0]?.rowId
    const second = visible[1]?.rowId
    if (first === undefined || second === undefined) {
      throw new Error('expected visible rows')
    }
    table.toggleRowSelected(first)
    table.getSelectedRowModel()
    table.toggleRowSelected(second, true)
    void table.headerSelectionState.value
    table.toggleRowSelected(first)
    table.toggleRowExpanded(second)
    table.getRowModel()
    table.toggleAllRowsSelected(true)
    void table.headerSelectionState.value
    table.toggleAllRowsSelected(false)
    table.toggleRowSelected(second)
    table.resetRowSelection()
    table.toggleRowExpanded(second)
  }

  it('selection without sort or filter runs no sort or filter pass', () => {
    const table = selectionTable()
    const count = counter(table)
    count.snapshot()

    exerciseSelection(table)

    expect(count.passes()).toEqual({ sort: 0, filter: 0 })
  })

  it('selection and expansion with an active sort and filter do not re-run them', () => {
    const table = selectionTable({
      defaultSorting: [{ id: 'amount', desc: true }],
      defaultColumnFilters: [{ id: 'status', value: 'open' }],
      defaultGlobalFilter: 'customer',
    })
    const count = counter(table)
    count.snapshot()
    expect(sortPasses).toHaveBeenCalledTimes(1)
    expect(filterPasses).toHaveBeenCalledTimes(1)

    exerciseSelection(table)

    expect(count.passes()).toEqual({ sort: 0, filter: 0 })
  })

  it('controlled selection writes from the parent do not re-run sort or filter', () => {
    const selectedRowIds = ref<DataTableRowId[]>([])
    const table = selectionTable({
      defaultSorting: [{ id: 'customer', desc: false }],
      defaultGlobalFilter: '9',
      selectedRowIds,
      onSelectedRowIdsChange: (next) => (selectedRowIds.value = next),
    })
    const count = counter(table)
    count.snapshot()

    const first = table.getRowModel()[0]
    if (!first) throw new Error('expected a visible row')
    table.toggleRowSelected(first.rowId)
    expect(table.isRowSelected(first.rowId)).toBe(true)
    selectedRowIds.value = []
    expect(table.headerSelectionState.value.someSelected).toBe(false)

    expect(count.passes()).toEqual({ sort: 0, filter: 0 })
  })
})

describe('useGhostDataTable regression counters: stage isolation', () => {
  // The counters above only prove something if the spies see real passes.
  it('runs exactly one sort pass per sort change and none per filter change', () => {
    const table = setup({
      data: invoices(1000),
      columns,
      getRowId,
      defaultPagination: { pageIndex: 1, pageSize: 25 },
    })
    const count = counter(table)
    count.snapshot()

    table.toggleSorting('amount')
    expect(count.passes()).toEqual({ sort: 1, filter: 1 })
    expect(amounts(table).slice(0, 3)).toEqual([0, 1, 2])

    count.snapshot()
    table.setGlobalFilter('customer 1')
    table.getRowModel()
    table.setGlobalFilter('customer 12')
    expect(count.passes()).toEqual({ sort: 0, filter: 2 })
  })

  it('skips the local sort and filter stages entirely when both are manual', () => {
    const table = setup({
      data: invoices(100),
      columns,
      getRowId,
      manualSorting: true,
      manualFiltering: true,
      defaultSorting: [{ id: 'amount', desc: false }],
      defaultGlobalFilter: 'customer',
    })
    table.getRowModel()
    table.setPageIndex(3)
    table.getRowModel()
    expect(sortPasses).not.toHaveBeenCalled()
    expect(filterPasses).not.toHaveBeenCalled()
  })
})
