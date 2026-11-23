import { effectScope, nextTick, ref, shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTablePaginationState,
  DataTableRowId,
  DataTableStateChangePayload,
  UseGhostDataTableOptions,
  UseGhostDataTableReturn,
} from './ghost-data-table'
import { useGhostDataTable } from './use-ghost-data-table'

interface Invoice {
  id: string
  customer?: string | null | undefined
  amount: number
  status?: string
}

const scopes: ReturnType<typeof effectScope>[] = []

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
})

function setup<TData>(
  options: UseGhostDataTableOptions<TData>,
): UseGhostDataTableReturn<TData> {
  const scope = effectScope()
  scopes.push(scope)
  const table = scope.run(() => useGhostDataTable(options))
  if (!table) throw new Error('useGhostDataTable did not run')
  return table
}

const getRowId = (row: Invoice): string => row.id

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', accessorKey: 'customer' },
  { id: 'amount', accessorKey: 'amount' },
  { id: 'status', accessorKey: 'status' },
]

function invoices(count: number): Invoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `inv-${String(index + 1)}`,
    customer: `Customer ${String(index + 1)}`,
    amount: index + 1,
  }))
}

const ids = (rows: readonly { rowId: DataTableRowId }[]): DataTableRowId[] =>
  rows.map((entry) => entry.rowId)

const sample: Invoice[] = [
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200, status: 'paid' },
  { id: 'inv-2', customer: 'Globex', amount: 980.5, status: 'open' },
  { id: 'inv-3', customer: 'Initech', amount: 42, status: 'paid' },
  { id: 'inv-4', customer: undefined, amount: 7, status: 'void' },
]

describe('useGhostDataTable row models', () => {
  it('derives core, sorted, filtered, pre-pagination, and paginated models', () => {
    const table = setup({
      data: invoices(30),
      columns,
      getRowId,
      defaultSorting: [{ id: 'amount', desc: true }],
      defaultGlobalFilter: 'customer 1',
      defaultPagination: { pageIndex: 2, pageSize: 5 },
    })

    expect(table.getCoreRowModel()).toHaveLength(30)
    expect(table.getCoreRowModel()[0]).toEqual({
      row: expect.objectContaining({ id: 'inv-1' }) as unknown,
      rowId: 'inv-1',
      rowIndex: 0,
    })
    expect(ids(table.getSortedRowModel()).slice(0, 2)).toEqual([
      'inv-30',
      'inv-29',
    ])
    // "Customer 1", "Customer 10".."Customer 19" in descending amount order.
    expect(ids(table.getFilteredRowModel())).toEqual([
      'inv-19',
      'inv-18',
      'inv-17',
      'inv-16',
      'inv-15',
      'inv-14',
      'inv-13',
      'inv-12',
      'inv-11',
      'inv-10',
      'inv-1',
    ])
    expect(table.getPrePaginationRowModel()).toBe(table.getFilteredRowModel())
    expect(ids(table.getRowModel())).toEqual([
      'inv-14',
      'inv-13',
      'inv-12',
      'inv-11',
      'inv-10',
    ])
    expect(table.getPaginationRowModel()).toBe(table.getRowModel())
    expect(table.rowCount.value).toBe(11)
    expect(table.pageCount.value).toBe(3)
  })

  it('never mutates consumer rows, the data array, or column definitions', () => {
    const data = Object.freeze(sample.map((row) => Object.freeze({ ...row })))
    const frozenColumns = Object.freeze(
      columns.map((column) => Object.freeze({ ...column })),
    )
    const table = setup<Invoice>({
      data,
      columns: frozenColumns,
      getRowId,
      defaultSorting: [{ id: 'customer', desc: false }],
      defaultGlobalFilter: 'a',
    })
    expect(() => table.getRowModel()).not.toThrow()
    expect(table.getCoreRowModel()[0]?.row).toBe(data[0])
  })

  it('reports selected rows from the rendered model only', () => {
    const table = setup({
      data: invoices(10),
      columns,
      getRowId,
      enableRowSelection: true,
      defaultSelectedRowIds: ['inv-1', 'inv-9'],
      defaultPagination: { pageIndex: 1, pageSize: 5 },
    })
    expect(ids(table.getSelectedRowModel())).toEqual(['inv-1'])
    expect(table.selectedRowIds.value).toEqual(['inv-1', 'inv-9'])
  })
})

describe('useGhostDataTable manual-processing matrix', () => {
  const page: Invoice[] = [
    { id: 'p-1', customer: 'Zeta', amount: 3 },
    { id: 'p-2', customer: 'Alpha', amount: 1 },
    { id: 'p-3', customer: 'Alpine', amount: 2 },
  ]
  const query = {
    defaultSorting: [{ id: 'customer', desc: false }],
    defaultGlobalFilter: 'al',
  }

  it('local (all false): sorts and filters the full set, then slices', () => {
    const table = setup({
      data: page,
      columns,
      getRowId,
      ...query,
      defaultPagination: { pageIndex: 1, pageSize: 1 },
    })
    expect(ids(table.getPrePaginationRowModel())).toEqual(['p-2', 'p-3'])
    expect(ids(table.getRowModel())).toEqual(['p-2'])
    expect(table.rowCount.value).toBe(2)
    expect(table.pageCount.value).toBe(2)
  })

  it('manualSorting with local pagination: filters but keeps data order', () => {
    const table = setup({
      data: page,
      columns,
      getRowId,
      ...query,
      manualSorting: true,
    })
    expect(ids(table.getRowModel())).toEqual(['p-2', 'p-3'])
  })

  it('manualFiltering with local pagination: sorts but keeps every row', () => {
    const table = setup({
      data: page,
      columns,
      getRowId,
      ...query,
      manualFiltering: true,
    })
    expect(ids(table.getRowModel())).toEqual(['p-2', 'p-3', 'p-1'])
    expect(table.rowCount.value).toBe(3)
  })

  it('manualPagination only: page-local sort then page-local filter', () => {
    const table = setup({
      data: page,
      columns,
      getRowId,
      ...query,
      manualPagination: true,
      rowCount: 300,
      defaultPagination: { pageIndex: 4, pageSize: 3 },
    })
    expect(ids(table.getRowModel())).toEqual(['p-2', 'p-3'])
    expect(table.rowCount.value).toBe(300)
    expect(table.pageCount.value).toBe(100)
    expect(table.pagination.value.pageIndex).toBe(4)
  })

  it('manualPagination + manualSorting: page-local filter only', () => {
    const table = setup({
      data: page,
      columns,
      getRowId,
      ...query,
      manualPagination: true,
      manualSorting: true,
      rowCount: 3,
    })
    expect(ids(table.getRowModel())).toEqual(['p-2', 'p-3'])
  })

  it('manualPagination + manualFiltering: page-local sort only', () => {
    const table = setup({
      data: page,
      columns,
      getRowId,
      ...query,
      manualPagination: true,
      manualFiltering: true,
      rowCount: 3,
    })
    expect(ids(table.getRowModel())).toEqual(['p-2', 'p-3', 'p-1'])
  })

  it('all manual: displays data as-is', () => {
    const table = setup({
      data: page,
      columns,
      getRowId,
      ...query,
      manualPagination: true,
      manualSorting: true,
      manualFiltering: true,
      rowCount: 3,
    })
    expect(table.getRowModel()).toBe(table.getCoreRowModel())
  })

  it('does not slice a server page larger than pageSize', () => {
    const table = setup({
      data: invoices(8),
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 80,
      defaultPagination: { pageIndex: 1, pageSize: 5 },
    })
    expect(table.getRowModel()).toHaveLength(8)
  })

  it('falls back to the loaded page when rowCount is not finite', () => {
    const rowCount = ref(Number.NaN)
    const table = setup({
      data: invoices(4),
      columns,
      getRowId,
      manualPagination: true,
      // A non-finite total (e.g. a failed parse) must not empty the table.
      rowCount,
    })
    expect(table.rowCount.value).toBe(4)
  })
})

describe('useGhostDataTable page-local vs global sort', () => {
  it('local sort orders the whole set before slicing the page', () => {
    const table = setup({
      data: invoices(6),
      columns,
      getRowId,
      defaultSorting: [{ id: 'amount', desc: true }],
      defaultPagination: { pageIndex: 1, pageSize: 2 },
    })
    expect(ids(table.getRowModel())).toEqual(['inv-6', 'inv-5'])
  })

  it('page-local sort only reorders the rows in data and does not emit', () => {
    const onStateChange = vi.fn()
    const table = setup({
      data: invoices(3),
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 300,
      onStateChange,
    })
    table.toggleSorting('amount')
    table.toggleSorting('amount')
    expect(ids(table.getRowModel())).toEqual(['inv-3', 'inv-2', 'inv-1'])
    expect(onStateChange).not.toHaveBeenCalled()
  })

  it('manualSorting emits one stateChange per sort action and keeps the page', () => {
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    const table = setup({
      data: invoices(3),
      columns,
      getRowId,
      manualPagination: true,
      manualSorting: true,
      rowCount: 300,
      defaultPagination: { pageIndex: 4, pageSize: 3 },
      onStateChange,
    })
    table.toggleSorting('amount')
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange.mock.calls[0]?.[0]).toEqual({
      requestId: 1,
      trigger: 'sorting',
      query: {
        sorting: [{ id: 'amount', desc: false }],
        columnFilters: [],
        globalFilter: undefined,
        pagination: { pageIndex: 4, pageSize: 3 },
      },
    })
    expect(ids(table.getRowModel())).toEqual(['inv-1', 'inv-2', 'inv-3'])
  })
})

describe('useGhostDataTable sorting', () => {
  it('cycles none → asc → desc → none and reports the direction', () => {
    const table = setup({ data: sample, columns, getRowId })
    expect(table.getSortDirection('amount')).toBe(false)
    table.toggleSorting('amount')
    expect(table.getSortDirection('amount')).toBe('asc')
    expect(ids(table.getRowModel())).toEqual([
      'inv-4',
      'inv-3',
      'inv-2',
      'inv-1',
    ])
    table.toggleSorting('amount')
    expect(table.getSortDirection('amount')).toBe('desc')
    table.toggleSorting('amount')
    expect(table.sorting.value).toEqual([])
    expect(ids(table.getRowModel())).toEqual([
      'inv-1',
      'inv-2',
      'inv-3',
      'inv-4',
    ])
  })

  it('honors only the first sorting entry (single-column phase one)', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultSorting: [
        { id: 'status', desc: false },
        { id: 'amount', desc: true },
      ],
    })
    expect(ids(table.getRowModel())).toEqual([
      'inv-2',
      'inv-1',
      'inv-3',
      'inv-4',
    ])
    table.setSorting([
      { id: 'amount', desc: false },
      { id: 'status', desc: false },
    ])
    expect(table.sorting.value).toEqual([{ id: 'amount', desc: false }])
  })

  it('places missing values last by default regardless of direction', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultSorting: [{ id: 'customer', desc: true }],
    })
    expect(ids(table.getRowModel())).toEqual([
      'inv-3',
      'inv-2',
      'inv-1',
      'inv-4',
    ])
    table.setSorting([{ id: 'customer', desc: false }])
    expect(ids(table.getRowModel())).toEqual([
      'inv-1',
      'inv-2',
      'inv-3',
      'inv-4',
    ])
  })

  it('supports sortUndefined first and false', () => {
    const first = setup({
      data: sample,
      columns: [
        { id: 'customer', accessorKey: 'customer', sortUndefined: 'first' },
      ],
      getRowId,
      defaultSorting: [{ id: 'customer', desc: true }],
    })
    expect(ids(first.getRowModel())[0]).toBe('inv-4')

    const asValue = setup({
      data: sample,
      columns: [
        { id: 'customer', accessorKey: 'customer', sortUndefined: false },
      ],
      getRowId,
      defaultSorting: [{ id: 'customer', desc: false }],
    })
    expect(ids(asValue.getRowModel())[0]).toBe('inv-4')
    asValue.setSorting([{ id: 'customer', desc: true }])
    expect(ids(asValue.getRowModel()).at(-1)).toBe('inv-4')
  })

  it('compares dates, numbers, booleans, and strings with default comparators', () => {
    interface Row {
      id: string
      when: Date
      flag: boolean
      label: string
    }
    const rows: Row[] = [
      { id: 'a', when: new Date('2026-03-01'), flag: true, label: 'b' },
      { id: 'b', when: new Date('2026-01-01'), flag: false, label: 'a' },
      { id: 'c', when: new Date('2026-02-01'), flag: true, label: 'C' },
    ]
    const table = setup<Row>({
      data: rows,
      columns: [
        { id: 'when', accessorKey: 'when' },
        { id: 'flag', accessorKey: 'flag' },
        { id: 'label', accessorFn: (row) => row.label },
      ],
      getRowId: (row) => row.id,
      defaultSorting: [{ id: 'when', desc: false }],
    })
    expect(ids(table.getRowModel())).toEqual(['b', 'c', 'a'])
    table.setSorting([{ id: 'flag', desc: false }])
    expect(ids(table.getRowModel())).toEqual(['b', 'a', 'c'])
    table.setSorting([{ id: 'label', desc: false }])
    expect(ids(table.getRowModel())).toEqual(['b', 'a', 'c'])
  })

  it('uses sortFn and ignores columns that cannot sort', () => {
    const sortFn = vi.fn((a: Invoice, b: Invoice) => b.amount - a.amount)
    const table = setup({
      data: sample,
      columns: [
        { id: 'custom', sortFn },
        { id: 'locked', accessorKey: 'amount', enableSorting: false },
        { id: 'display' },
      ],
      getRowId,
      defaultSorting: [{ id: 'custom', desc: false }],
    })
    expect(ids(table.getRowModel())).toEqual([
      'inv-1',
      'inv-2',
      'inv-3',
      'inv-4',
    ])
    expect(sortFn).toHaveBeenCalled()
    expect(table.canSort('custom')).toBe(true)
    expect(table.canSort('locked')).toBe(false)
    expect(table.canSort('display')).toBe(false)
    expect(table.canSort('missing')).toBe(false)

    table.toggleSorting('locked')
    expect(table.sorting.value).toEqual([{ id: 'custom', desc: false }])
    table.setSorting([{ id: 'locked', desc: true }])
    expect(ids(table.getRowModel())).toEqual([
      'inv-1',
      'inv-2',
      'inv-3',
      'inv-4',
    ])
  })

  it('ignores sort toggles while disabled', () => {
    const disabled = ref(true)
    const table = setup({ data: sample, columns, getRowId, disabled })
    table.toggleSorting('amount')
    expect(table.sorting.value).toEqual([])
    expect(table.disabled.value).toBe(true)
  })
})

describe('useGhostDataTable default filtering contract', () => {
  it('matches the global filter case-insensitively with OR across columns', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultGlobalFilter: 'acme',
    })
    expect(ids(table.getRowModel())).toEqual(['inv-1'])
    table.setGlobalFilter('PAID')
    expect(ids(table.getRowModel())).toEqual(['inv-1', 'inv-3'])
    table.setGlobalFilter('42')
    expect(ids(table.getRowModel())).toEqual(['inv-3'])
  })

  it('treats undefined, null, and empty string as a cleared global filter', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultGlobalFilter: 'zzz',
    })
    expect(table.getRowModel()).toHaveLength(0)
    for (const cleared of ['', null, undefined]) {
      table.setGlobalFilter('zzz')
      table.setGlobalFilter(cleared)
      expect(table.getRowModel()).toHaveLength(4)
    }
  })

  it('skips null and undefined cells instead of matching their string form', () => {
    const table = setup({
      data: [
        ...sample,
        { id: 'inv-5', customer: null, amount: 0, status: 'paid' },
      ],
      columns,
      getRowId,
      defaultGlobalFilter: 'un',
    })
    expect(ids(table.getRowModel())).toEqual([])
    table.setGlobalFilter('ull')
    expect(ids(table.getRowModel())).toEqual([])
  })

  it('uses strict equality for non-string global filters', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultGlobalFilter: 42,
    })
    expect(ids(table.getRowModel())).toEqual(['inv-3'])
    table.setGlobalFilter(4)
    expect(table.getRowModel()).toHaveLength(0)
  })

  it('ignores columns with enableColumnFilter false or no accessor', () => {
    const table = setup({
      data: sample,
      columns: [
        { id: 'customer', accessorKey: 'customer', enableColumnFilter: false },
        { id: 'status', accessorKey: 'status' },
        { id: 'actions', header: 'Actions' },
      ],
      getRowId,
      defaultGlobalFilter: 'globex',
    })
    expect(table.getRowModel()).toHaveLength(0)
    table.setGlobalFilter('open')
    expect(ids(table.getRowModel())).toEqual(['inv-2'])
  })

  it('combines active column filters with AND after the global filter', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultGlobalFilter: 'i',
    })
    table.setColumnFilter('status', 'PAID')
    expect(ids(table.getRowModel())).toEqual(['inv-1', 'inv-3'])
    table.setColumnFilter('customer', 'init')
    expect(ids(table.getRowModel())).toEqual(['inv-3'])
    expect(table.columnFilters.value).toEqual([
      { id: 'status', value: 'PAID' },
      { id: 'customer', value: 'init' },
    ])
    table.setColumnFilter('customer', 'acme')
    expect(ids(table.getRowModel())).toEqual(['inv-1'])
  })

  it('treats empty column filter values as inactive and removes them', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultColumnFilters: [
        { id: 'status', value: '' },
        { id: 'customer', value: null },
        { id: 'amount', value: undefined },
      ],
    })
    expect(table.getRowModel()).toHaveLength(4)
    table.setColumnFilter('status', 'void')
    expect(ids(table.getRowModel())).toEqual(['inv-4'])
    table.setColumnFilter('status', '')
    expect(table.columnFilters.value).toEqual([
      { id: 'customer', value: null },
      { id: 'amount', value: undefined },
    ])
    table.setColumnFilter('unknown', '')
    expect(table.columnFilters.value).toHaveLength(2)
  })

  it('omitted filterFn: substring for strings, equality otherwise, missing cells fail', () => {
    const table = setup({ data: sample, columns, getRowId })
    table.setColumnFilters([{ id: 'customer', value: 'o' }])
    expect(ids(table.getRowModel())).toEqual(['inv-1', 'inv-2'])
    table.setColumnFilters([{ id: 'amount', value: 42 }])
    expect(ids(table.getRowModel())).toEqual(['inv-3'])
    table.setColumnFilters([{ id: 'customer', value: 0 }])
    expect(table.getRowModel()).toHaveLength(0)
  })

  it('uses a column filterFn and ignores filters it cannot evaluate', () => {
    const filterFn = vi.fn(
      (row: Invoice, _columnId: string, value: unknown) =>
        typeof value === 'number' && row.amount >= value,
    )
    const table = setup({
      data: sample,
      columns: [
        { id: 'min', filterFn },
        { id: 'locked', accessorKey: 'status', enableColumnFilter: false },
        { id: 'display' },
      ],
      getRowId,
    })
    table.setColumnFilters([{ id: 'min', value: 100 }])
    expect(ids(table.getRowModel())).toEqual(['inv-1', 'inv-2'])
    expect(filterFn).toHaveBeenCalledWith(sample[0], 'min', 100)
    table.setColumnFilters([
      { id: 'locked', value: 'paid' },
      { id: 'display', value: 'x' },
      { id: 'missing', value: 'x' },
    ])
    expect(table.getRowModel()).toHaveLength(4)
  })
})

describe('useGhostDataTable pagination', () => {
  it('uses page 1 of 1 when rowCount is 0, even with a pageCount override', async () => {
    const onStateChange = vi.fn()
    const rowCount = ref(100)
    const table = setup({
      data: invoices(10),
      columns,
      getRowId,
      manualPagination: true,
      rowCount,
      pageCount: 10,
      defaultPagination: { pageIndex: 4, pageSize: 10 },
      onStateChange,
    })
    expect(table.pageCount.value).toBe(10)
    rowCount.value = 0
    expect(table.pageCount.value).toBe(1)
    expect(table.pagination.value).toEqual({ pageIndex: 1, pageSize: 10 })
    await nextTick()
    expect(onStateChange).toHaveBeenCalledTimes(1)
  })

  it('uses page 1 of 1 for an empty local data set', () => {
    const table = setup({
      data: [],
      columns,
      getRowId,
      defaultPagination: { pageIndex: 3, pageSize: 10 },
    })
    expect(table.rowCount.value).toBe(0)
    expect(table.pageCount.value).toBe(1)
    expect(table.pagination.value.pageIndex).toBe(1)
    expect(table.getRowModel()).toEqual([])
  })

  it('keeps pageIndex when a page-local filter empties a server page', async () => {
    const onStateChange = vi.fn()
    const onPaginationChange = vi.fn()
    const table = setup({
      data: invoices(25),
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 250,
      defaultPagination: { pageIndex: 4, pageSize: 25 },
      onStateChange,
      onPaginationChange,
    })
    table.setGlobalFilter('no such customer')
    await nextTick()
    expect(table.getRowModel()).toHaveLength(0)
    expect(table.pagination.value.pageIndex).toBe(4)
    expect(onStateChange).not.toHaveBeenCalled()
    expect(onPaginationChange).not.toHaveBeenCalled()
  })

  it('server filter on page 4 resets to page 1 with exactly one stateChange', async () => {
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    const onPaginationChange = vi.fn()
    const onGlobalFilterChange = vi.fn()
    const table = setup({
      data: invoices(25),
      columns,
      getRowId,
      manualPagination: true,
      manualFiltering: true,
      rowCount: 250,
      defaultPagination: { pageIndex: 4, pageSize: 25 },
      onStateChange,
      onPaginationChange,
      onGlobalFilterChange,
    })
    table.setGlobalFilter('acme')
    await nextTick()
    expect(onGlobalFilterChange).toHaveBeenCalledWith('acme')
    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 1,
      pageSize: 25,
    })
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange.mock.calls[0]?.[0]).toEqual({
      requestId: 1,
      trigger: 'globalFilter',
      query: {
        sorting: [],
        columnFilters: [],
        globalFilter: 'acme',
        pagination: { pageIndex: 1, pageSize: 25 },
      },
    })
    // Server data is pre-filtered: the page is displayed as delivered.
    expect(table.getRowModel()).toHaveLength(25)
  })

  it('server column filter coalesces with the page reset and the follow-up response', async () => {
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    const data = shallowRef(invoices(25))
    const rowCount = ref(250)
    const table = setup({
      data,
      columns,
      getRowId,
      manualPagination: true,
      manualFiltering: true,
      rowCount,
      defaultPagination: { pageIndex: 4, pageSize: 25 },
      onStateChange,
    })
    table.setColumnFilter('status', 'paid')
    // Server responds to the single request with a smaller result.
    data.value = invoices(10)
    rowCount.value = 10
    await nextTick()
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange.mock.calls[0]?.[0].trigger).toBe('columnFilters')
    expect(onStateChange.mock.calls[0]?.[0].query.columnFilters).toEqual([
      { id: 'status', value: 'paid' },
    ])
    expect(table.pagination.value.pageIndex).toBe(1)
  })

  it('server filter on page 1 emits once without a pagination write', () => {
    const onStateChange = vi.fn()
    const onPaginationChange = vi.fn()
    const table = setup({
      data: invoices(5),
      columns,
      getRowId,
      manualFiltering: true,
      onStateChange,
      onPaginationChange,
    })
    table.setGlobalFilter('x')
    table.setGlobalFilter('x')
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onPaginationChange).not.toHaveBeenCalled()
  })

  it('full-local filter keeps pageIndex, then clamps to the last valid page', async () => {
    const onPaginationChange = vi.fn()
    const onStateChange = vi.fn()
    const table = setup({
      data: invoices(100),
      columns,
      getRowId,
      defaultPagination: { pageIndex: 4, pageSize: 10 },
      onPaginationChange,
      onStateChange,
    })
    table.setGlobalFilter('customer 1')
    // 12 matches ("Customer 1", "10".."19", "100") → 2 pages.
    expect(table.pagination.value.pageIndex).toBe(2)
    await nextTick()
    expect(onPaginationChange).toHaveBeenCalledTimes(1)
    expect(onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 2,
      pageSize: 10,
    })
    expect(onStateChange).not.toHaveBeenCalled()

    table.setGlobalFilter('customer 10')
    await nextTick()
    expect(table.pagination.value.pageIndex).toBe(1)
  })

  it('keeps the page when a full-local filter still covers it', async () => {
    const table = setup({
      data: invoices(100),
      columns,
      getRowId,
      defaultPagination: { pageIndex: 2, pageSize: 10 },
    })
    table.setGlobalFilter('customer')
    await nextTick()
    expect(table.pagination.value.pageIndex).toBe(2)
  })

  it('clamps (not resets) on a local data reference change', async () => {
    const data = shallowRef(invoices(100))
    const table = setup({
      data,
      columns,
      getRowId,
      defaultPagination: { pageIndex: 8, pageSize: 10 },
    })
    data.value = invoices(95)
    await nextTick()
    expect(table.pagination.value.pageIndex).toBe(8)
    data.value = invoices(55)
    await nextTick()
    expect(table.pagination.value.pageIndex).toBe(6)
  })

  it('emits one stateChange when a server rowCount shrink clamps the page', async () => {
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    const rowCount = ref(250)
    const table = setup({
      data: invoices(25),
      columns,
      getRowId,
      manualPagination: true,
      rowCount,
      defaultPagination: { pageIndex: 8, pageSize: 25 },
      onStateChange,
    })
    rowCount.value = 60
    await nextTick()
    expect(table.pagination.value.pageIndex).toBe(3)
    expect(onStateChange).toHaveBeenCalledTimes(1)
    expect(onStateChange.mock.calls[0]?.[0]).toMatchObject({
      trigger: 'pagination',
      query: { pagination: { pageIndex: 3, pageSize: 25 } },
    })
    rowCount.value = 70
    await nextTick()
    expect(onStateChange).toHaveBeenCalledTimes(1)
  })

  it('does not write or emit when hydrating an out-of-range page', async () => {
    const onStateChange = vi.fn()
    const onPaginationChange = vi.fn()
    const table = setup({
      data: invoices(5),
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 20,
      pagination: { pageIndex: 9, pageSize: 10 },
      onStateChange,
      onPaginationChange,
    })
    await nextTick()
    expect(table.pagination.value.pageIndex).toBe(2)
    expect(onStateChange).not.toHaveBeenCalled()
    expect(onPaginationChange).not.toHaveBeenCalled()
  })

  it('resets to page 1 on pageSize change and clamps page navigation', () => {
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    const table = setup({
      data: invoices(10),
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 100,
      defaultPagination: { pageIndex: 3, pageSize: 10 },
      onStateChange,
    })
    table.setPageSize(20)
    expect(table.pagination.value).toEqual({ pageIndex: 1, pageSize: 20 })
    table.setPageIndex(99)
    expect(table.pagination.value.pageIndex).toBe(5)
    table.setPageIndex(5)
    table.setPageIndex(Number.NaN)
    expect(table.pagination.value.pageIndex).toBe(1)
    table.setPageSize(Number.NaN)
    expect(table.pagination.value).toEqual({ pageIndex: 1, pageSize: 10 })
    table.setPageSize(0)
    expect(table.pagination.value.pageSize).toBe(1)
    expect(
      onStateChange.mock.calls.map(([payload]) => payload.requestId),
    ).toEqual([1, 2, 3, 4, 5])
    expect(
      onStateChange.mock.calls.every(
        ([payload]) => payload.trigger === 'pagination',
      ),
    ).toBe(true)
  })

  it('does not emit stateChange for local pagination or sorting', () => {
    const onStateChange = vi.fn()
    const table = setup({
      data: invoices(30),
      columns,
      getRowId,
      onStateChange,
    })
    table.setPageIndex(2)
    table.toggleSorting('amount')
    table.setGlobalFilter('1')
    expect(onStateChange).not.toHaveBeenCalled()
    expect(table.pagination.value.pageIndex).toBe(2)
  })
})

describe('useGhostDataTable stateChange and retry', () => {
  it('retry re-emits the current query with a fresh requestId', () => {
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    const table = setup({
      data: invoices(10),
      columns,
      getRowId,
      manualPagination: true,
      manualFiltering: true,
      rowCount: 100,
      onStateChange,
    })
    table.retry()
    table.setGlobalFilter('a')
    table.retry()
    const payloads = onStateChange.mock.calls.map(([payload]) => payload)
    expect(payloads.map((payload) => payload.requestId)).toEqual([1, 2, 3])
    expect(payloads[0]?.trigger).toBe('pagination')
    expect(payloads[2]).toEqual({ ...payloads[1], requestId: 3 })
    expect(table.query.value).toEqual(payloads[2]?.query)
  })

  it('builds the query from the next values while v-models are controlled', () => {
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    const onColumnFiltersChange = vi.fn()
    const pagination: DataTablePaginationState = { pageIndex: 4, pageSize: 25 }
    const columnFilters: DataTableColumnFilter[] = []
    const table = setup({
      data: invoices(25),
      columns,
      getRowId,
      manualPagination: true,
      manualFiltering: true,
      rowCount: 250,
      pagination,
      columnFilters,
      onStateChange,
      onColumnFiltersChange,
    })
    table.setColumnFilter('customer', 'acme')
    // The parent has not applied the write yet; state still reads the props.
    expect(table.columnFilters.value).toBe(columnFilters)
    expect(table.pagination.value.pageIndex).toBe(4)
    expect(onColumnFiltersChange).toHaveBeenCalledWith([
      { id: 'customer', value: 'acme' },
    ])
    expect(onStateChange.mock.calls[0]?.[0].query).toEqual({
      sorting: [],
      columnFilters: [{ id: 'customer', value: 'acme' }],
      globalFilter: undefined,
      pagination: { pageIndex: 1, pageSize: 25 },
    })
  })

  it('treats a controlled undefined global filter as cleared, not uncontrolled', () => {
    const globalFilter = ref<unknown>('acme')
    const table = setup({
      data: sample,
      columns,
      getRowId,
      globalFilter,
      onGlobalFilterChange: (value) => {
        globalFilter.value = value
      },
    })
    expect(table.getRowModel()).toHaveLength(1)
    table.setGlobalFilter(undefined)
    expect(table.globalFilter.value).toBeUndefined()
    expect(table.getRowModel()).toHaveLength(4)
  })
})

describe('useGhostDataTable selection', () => {
  it('local select-all targets every filtered row across pages', () => {
    const data = invoices(100).map((row, index) => ({
      ...row,
      status: index % 5 < 2 ? 'match' : 'other',
    }))
    const table = setup({
      data,
      columns,
      getRowId,
      enableRowSelection: true,
      defaultPagination: { pageIndex: 1, pageSize: 25 },
      defaultSelectedRowIds: ['inv-3'],
    })
    table.setColumnFilter('status', 'match')
    expect(table.getPrePaginationRowModel()).toHaveLength(40)
    expect(table.getRowModel()).toHaveLength(25)

    table.toggleAllRowsSelected(true)
    expect(table.selectedRowIds.value).toHaveLength(41)
    expect(table.headerSelectionState.value).toEqual({
      allSelected: true,
      someSelected: false,
    })
    table.setPageIndex(2)
    expect(table.selectedRowIds.value).toHaveLength(41)
    expect(table.getSelectedRowModel()).toHaveLength(15)

    table.toggleAllRowsSelected()
    expect(table.selectedRowIds.value).toEqual(['inv-3'])
    expect(table.headerSelectionState.value).toEqual({
      allSelected: false,
      someSelected: false,
    })
  })

  it('server select-all targets only the processed loaded page', () => {
    const page = invoices(25).map((row, index) => ({
      ...row,
      status: index < 3 ? 'match' : 'other',
    }))
    const table = setup({
      data: page,
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 250,
      enableRowSelection: true,
      defaultSelectedRowIds: ['other-page-id'],
    })
    table.setColumnFilter('status', 'match')
    table.toggleAllRowsSelected()
    expect(table.selectedRowIds.value).toEqual([
      'other-page-id',
      'inv-1',
      'inv-2',
      'inv-3',
    ])
    table.setColumnFilter('status', undefined)
    expect(table.headerSelectionState.value).toEqual({
      allSelected: false,
      someSelected: true,
    })
    table.toggleAllRowsSelected(true)
    table.toggleAllRowsSelected(false)
    expect(table.selectedRowIds.value).toEqual(['other-page-id'])
  })

  it('keeps cross-page server selection across page swaps (1 → 2 → 1)', async () => {
    const pageOne = invoices(5)
    const pageTwo = invoices(10).slice(5)
    const data = shallowRef(pageOne)
    const table = setup({
      data,
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 10,
      defaultPagination: { pageIndex: 1, pageSize: 5 },
      enableRowSelection: true,
      enableRowExpansion: true,
    })
    table.toggleRowSelected('inv-1')
    table.toggleRowExpanded('inv-1')
    table.setPageIndex(2)
    data.value = pageTwo
    await nextTick()
    table.toggleRowSelected('inv-7')
    table.setPageIndex(1)
    data.value = pageOne
    await nextTick()
    expect(table.isRowSelected('inv-1')).toBe(true)
    expect(table.selectedRowIds.value).toEqual(['inv-1', 'inv-7'])
    expect(table.isRowExpanded('inv-1')).toBe(true)
  })

  it('local pruning checks source data rows, not the filtered view', async () => {
    const data = shallowRef(sample)
    const onSelectedRowIdsChange = vi.fn()
    const table = setup({
      data,
      columns,
      getRowId,
      enableRowSelection: true,
      enableRowExpansion: true,
      onSelectedRowIdsChange,
    })
    table.toggleRowSelected('inv-1')
    table.toggleRowExpanded('inv-1')
    table.setGlobalFilter('globex')
    expect(table.getRowModel().map((entry) => entry.rowId)).toEqual(['inv-2'])

    data.value = sample.map((row) => ({ ...row }))
    await nextTick()
    table.setGlobalFilter('')
    expect(table.isRowSelected('inv-1')).toBe(true)
    expect(table.isRowExpanded('inv-1')).toBe(true)
    expect(onSelectedRowIdsChange).toHaveBeenCalledTimes(1)

    data.value = sample.slice(1)
    await nextTick()
    expect(table.isRowSelected('inv-1')).toBe(false)
    expect(table.isRowExpanded('inv-1')).toBe(false)
    expect(onSelectedRowIdsChange).toHaveBeenLastCalledWith([])
  })

  it('server filter + local pagination preserves selection across responses', async () => {
    const data = shallowRef(sample)
    const table = setup({
      data,
      columns,
      getRowId,
      manualFiltering: true,
      enableRowSelection: true,
    })
    table.toggleRowSelected('inv-1')
    table.setGlobalFilter('globex')
    data.value = sample.slice(1, 2)
    await nextTick()
    table.setGlobalFilter('')
    data.value = sample
    await nextTick()
    expect(table.isRowSelected('inv-1')).toBe(true)
  })

  it('server pages never prune selection', async () => {
    const data = shallowRef(sample)
    const table = setup({
      data,
      columns,
      getRowId,
      manualPagination: true,
      rowCount: 40,
      enableRowSelection: true,
      defaultSelectedRowIds: ['inv-1'],
    })
    data.value = []
    await nextTick()
    expect(table.selectedRowIds.value).toEqual(['inv-1'])
  })

  it('is inert when selection is not enabled or the table is disabled', () => {
    const enableRowSelection = ref(false)
    const disabled = ref(false)
    const table = setup({
      data: sample,
      columns,
      getRowId,
      enableRowSelection,
      disabled,
    })
    table.toggleRowSelected('inv-1')
    table.toggleAllRowsSelected()
    expect(table.selectedRowIds.value).toEqual([])
    enableRowSelection.value = true
    disabled.value = true
    table.toggleRowSelected('inv-1')
    expect(table.selectedRowIds.value).toEqual([])
    disabled.value = false
    table.toggleRowSelected('inv-1')
    table.toggleRowSelected('inv-1', true)
    expect(table.selectedRowIds.value).toEqual(['inv-1'])
    table.toggleRowSelected('inv-1', false)
    expect(table.selectedRowIds.value).toEqual([])
  })

  it('resetRowSelection clears every id, including other pages', () => {
    const onSelectedRowIdsChange = vi.fn()
    const table = setup({
      data: sample,
      columns,
      getRowId,
      enableRowSelection: true,
      defaultSelectedRowIds: ['inv-1', 'remote'],
      onSelectedRowIdsChange,
    })
    table.resetRowSelection()
    table.resetRowSelection()
    expect(table.selectedRowIds.value).toEqual([])
    expect(onSelectedRowIdsChange).toHaveBeenCalledTimes(1)
  })

  it('reports an empty header state when the target set is empty', () => {
    const table = setup({
      data: [],
      columns,
      getRowId,
      enableRowSelection: true,
    })
    expect(table.headerSelectionState.value).toEqual({
      allSelected: false,
      someSelected: false,
    })
    table.toggleAllRowsSelected()
    expect(table.selectedRowIds.value).toEqual([])
  })
})

describe('useGhostDataTable expansion', () => {
  it('collapses other rows when allowMultipleExpanded is false', () => {
    const table = setup({
      data: sample,
      columns,
      getRowId,
      enableRowExpansion: true,
      allowMultipleExpanded: false,
    })
    table.toggleRowExpanded('inv-1')
    table.toggleRowExpanded('inv-2')
    expect(table.expandedRowIds.value).toEqual(['inv-2'])
    table.toggleRowExpanded('inv-2')
    expect(table.expandedRowIds.value).toEqual([])
  })

  it('allows multiple rows by default and is inert when disabled', () => {
    const disabled = ref(false)
    const table = setup({
      data: sample,
      columns,
      getRowId,
      enableRowExpansion: true,
      disabled,
    })
    table.toggleRowExpanded('inv-1')
    table.toggleRowExpanded('inv-2', true)
    table.toggleRowExpanded('inv-2', true)
    expect(table.expandedRowIds.value).toEqual(['inv-1', 'inv-2'])
    disabled.value = true
    table.toggleRowExpanded('inv-1')
    expect(table.isRowExpanded('inv-1')).toBe(true)
  })

  it('is inert when expansion is not enabled', () => {
    const table = setup({ data: sample, columns, getRowId })
    table.toggleRowExpanded('inv-1')
    expect(table.expandedRowIds.value).toEqual([])
  })
})

describe('useGhostDataTable performance regressions', () => {
  function countingColumns() {
    const sortFn = vi.fn((a: Invoice, b: Invoice) => a.amount - b.amount)
    const filterFn = vi.fn(
      (row: Invoice, _id: string, value: unknown) => row.status === value,
    )
    const accessorFn = vi.fn((row: Invoice) => row.customer)
    const counted: DataTableColumnDef<Invoice>[] = [
      { id: 'amount', accessorKey: 'amount', sortFn },
      { id: 'status', accessorKey: 'status', filterFn },
      { id: 'customer', accessorFn },
    ]
    return { counted, sortFn, filterFn, accessorFn }
  }

  const rows = (): Invoice[] =>
    invoices(1000).map((row, index) => ({
      ...row,
      amount: (index * 7919) % 1000,
      status: index % 2 === 0 ? 'paid' : 'open',
    }))

  it('does not re-sort or re-filter on page change after a local sort', () => {
    const { counted, sortFn, filterFn } = countingColumns()
    const table = setup({
      data: rows(),
      columns: counted,
      getRowId,
      defaultSorting: [{ id: 'amount', desc: false }],
      defaultColumnFilters: [{ id: 'status', value: 'paid' }],
      defaultPagination: { pageIndex: 1, pageSize: 25 },
    })
    expect(table.getRowModel()).toHaveLength(25)
    const sortCalls = sortFn.mock.calls.length
    const filterCalls = filterFn.mock.calls.length
    expect(sortCalls).toBeGreaterThan(0)

    table.setPageIndex(2)
    expect(table.getRowModel()).toHaveLength(25)
    table.setPageIndex(5)
    expect(table.getRowModel()).toHaveLength(25)
    expect(sortFn).toHaveBeenCalledTimes(sortCalls)
    expect(filterFn).toHaveBeenCalledTimes(filterCalls)
  })

  it('runs no sort, filter, or accessor callback when toggling selection or expansion', () => {
    const { counted, sortFn, filterFn, accessorFn } = countingColumns()
    const table = setup({
      data: rows(),
      columns: counted,
      getRowId,
      enableRowSelection: true,
      enableRowExpansion: true,
      defaultSorting: [{ id: 'amount', desc: true }],
      defaultColumnFilters: [{ id: 'status', value: 'open' }],
      defaultGlobalFilter: 'customer',
    })
    const firstRow = table.getRowModel()[0]
    if (!firstRow) throw new Error('expected a visible row')
    const before = [
      sortFn.mock.calls.length,
      filterFn.mock.calls.length,
      accessorFn.mock.calls.length,
    ]

    table.toggleRowSelected(firstRow.rowId)
    table.toggleRowExpanded(firstRow.rowId)
    expect(table.getSelectedRowModel()).toEqual([firstRow])
    expect(table.getRowModel()[0]).toBe(firstRow)
    void table.headerSelectionState.value
    table.toggleAllRowsSelected()

    expect([
      sortFn.mock.calls.length,
      filterFn.mock.calls.length,
      accessorFn.mock.calls.length,
    ]).toEqual(before)
  })

  it('does not re-sort while the filter changes', () => {
    const { counted, sortFn } = countingColumns()
    const table = setup({
      data: rows(),
      columns: counted,
      getRowId,
      defaultSorting: [{ id: 'amount', desc: false }],
    })
    table.getRowModel()
    const sortCalls = sortFn.mock.calls.length
    table.setGlobalFilter('customer 1')
    table.getRowModel()
    table.setGlobalFilter('customer 12')
    table.getRowModel()
    expect(sortFn).toHaveBeenCalledTimes(sortCalls)
  })
})

describe('useGhostDataTable misc state', () => {
  it('exposes loading and passes accessor indexes from the source array', () => {
    const accessorFn = vi.fn(
      (row: Invoice, index: number) => `${row.id}:${String(index)}`,
    )
    const table = setup({
      data: sample,
      columns: [{ id: 'label', accessorFn }],
      getRowId,
      loading: true,
      defaultGlobalFilter: 'inv-3:2',
    })
    expect(table.loading.value).toBe(true)
    expect(ids(table.getRowModel())).toEqual(['inv-3'])
  })

  it('ignores no-op sorting and column filter writes', () => {
    const onSortingChange = vi.fn()
    const onColumnFiltersChange = vi.fn()
    const table = setup({
      data: sample,
      columns,
      getRowId,
      defaultSorting: [{ id: 'amount', desc: false }],
      defaultColumnFilters: [{ id: 'status', value: 'paid' }],
      onSortingChange,
      onColumnFiltersChange,
    })
    table.setSorting([{ id: 'amount', desc: false }])
    table.setColumnFilters([{ id: 'status', value: 'paid' }])
    table.setColumnFilter('status', 'paid')
    expect(onSortingChange).not.toHaveBeenCalled()
    expect(onColumnFiltersChange).not.toHaveBeenCalled()
  })
})
