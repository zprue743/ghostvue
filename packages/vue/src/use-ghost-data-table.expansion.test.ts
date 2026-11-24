import { effectScope, nextTick, shallowRef } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  DataTableColumnDef,
  DataTableRowId,
  UseGhostDataTableOptions,
  UseGhostDataTableReturn,
} from './ghost-data-table'
import { useGhostDataTable } from './use-ghost-data-table'

/*
 * Row expansion state (GHO-244; spec "State model → Expansion" and "Row
 * identity"): expansion is a list of `getRowId` keys, never row indexes, and
 * server-owned data (manual pagination or manual filtering) never prunes it.
 */

interface Invoice {
  id: string
  customer: string
  amount: number
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

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', accessorKey: 'customer', enableSorting: true },
  { id: 'amount', accessorKey: 'amount', enableSorting: true },
]

function invoices(from: number, to: number): Invoice[] {
  const rows: Invoice[] = []
  for (let n = from; n <= to; n += 1) {
    rows.push({
      id: `inv-${String(n)}`,
      customer: `Customer ${String(n)}`,
      amount: n,
    })
  }
  return rows
}

/** Ids of the rendered rows whose detail row is open, in render order. */
function openRows(table: UseGhostDataTableReturn<Invoice>): DataTableRowId[] {
  return table
    .getRowModel()
    .filter((entry) => table.isRowExpanded(entry.rowId))
    .map((entry) => entry.rowId)
}

describe('useGhostDataTable expansion is keyed by getRowId', () => {
  it('stores and emits row ids, not row indexes', () => {
    const onExpandedRowIdsChange = vi.fn()
    const table = setup({
      data: invoices(1, 3),
      columns,
      // Deliberately unlike the array position or the `id` field.
      getRowId: (row) => `key:${row.customer}`,
      enableRowExpansion: true,
      onExpandedRowIdsChange,
    })
    table.toggleRowExpanded('key:Customer 2')
    expect(table.expandedRowIds.value).toEqual(['key:Customer 2'])
    expect(onExpandedRowIdsChange).toHaveBeenLastCalledWith(['key:Customer 2'])
    expect(openRows(table)).toEqual(['key:Customer 2'])
  })

  it('keeps the same row open when sorting moves it', () => {
    const table = setup({
      data: invoices(1, 3),
      columns,
      getRowId: (row) => row.id,
      enableRowExpansion: true,
      defaultExpandedRowIds: ['inv-1'],
    })
    table.setSorting([{ id: 'amount', desc: true }])
    expect(table.getRowModel().map((entry) => entry.rowId)).toEqual([
      'inv-3',
      'inv-2',
      'inv-1',
    ])
    expect(openRows(table)).toEqual(['inv-1'])
  })

  it('follows the row across reorder and insert in a new data array', async () => {
    const data = shallowRef(invoices(1, 3))
    const onExpandedRowIdsChange = vi.fn()
    const table = setup({
      data,
      columns,
      getRowId: (row) => row.id,
      enableRowExpansion: true,
      defaultExpandedRowIds: ['inv-2'],
      onExpandedRowIdsChange,
    })

    // Reversed clones: index 1 is still inv-2 by coincidence, so also insert.
    data.value = [
      { id: 'inv-0', customer: 'Customer 0', amount: 0 },
      ...invoices(1, 3)
        .reverse()
        .map((row) => ({ ...row })),
    ]
    await nextTick()
    expect(table.getRowModel().map((entry) => entry.rowId)).toEqual([
      'inv-0',
      'inv-3',
      'inv-2',
      'inv-1',
    ])
    expect(openRows(table)).toEqual(['inv-2'])
    expect(table.isRowExpanded('inv-0')).toBe(false)
    expect(onExpandedRowIdsChange).not.toHaveBeenCalled()
  })

  it('keeps string and numeric ids distinct', () => {
    const table = setup({
      data: [
        { key: 1, label: 'number' },
        { key: '1', label: 'string' },
      ],
      columns: [{ id: 'label', accessorKey: 'label' }],
      getRowId: (row) => row.key,
      enableRowExpansion: true,
    })
    table.toggleRowExpanded(1)
    expect(table.isRowExpanded(1)).toBe(true)
    expect(table.isRowExpanded('1')).toBe(false)
  })
})

describe('useGhostDataTable expansion is not pruned by server data', () => {
  it('keeps ids across server page changes (1 → 2 → 1) without emitting', async () => {
    const data = shallowRef(invoices(1, 5))
    const onExpandedRowIdsChange = vi.fn()
    const table = setup({
      data,
      columns,
      getRowId: (row) => row.id,
      manualPagination: true,
      rowCount: 10,
      defaultPagination: { pageIndex: 1, pageSize: 5 },
      enableRowExpansion: true,
      onExpandedRowIdsChange,
    })
    table.toggleRowExpanded('inv-2')
    expect(onExpandedRowIdsChange).toHaveBeenCalledTimes(1)

    table.setPageIndex(2)
    data.value = invoices(6, 10)
    await nextTick()
    // Page 2 renders no open detail rows, but inv-2 stays expanded.
    expect(openRows(table)).toEqual([])
    expect(table.expandedRowIds.value).toEqual(['inv-2'])
    table.toggleRowExpanded('inv-7')

    table.setPageIndex(1)
    data.value = invoices(1, 5)
    await nextTick()
    expect(openRows(table)).toEqual(['inv-2'])
    expect(table.expandedRowIds.value).toEqual(['inv-2', 'inv-7'])
    // Only the two user toggles wrote state; page swaps never did.
    expect(onExpandedRowIdsChange).toHaveBeenCalledTimes(2)
  })

  it('keeps ids through an empty or transient server page response', async () => {
    const data = shallowRef(invoices(1, 5))
    const table = setup({
      data,
      columns,
      getRowId: (row) => row.id,
      manualPagination: true,
      rowCount: 10,
      enableRowExpansion: true,
      defaultExpandedRowIds: ['inv-1', 'remote-id'],
    })
    data.value = []
    await nextTick()
    data.value = invoices(1, 5)
    await nextTick()
    expect(table.expandedRowIds.value).toEqual(['inv-1', 'remote-id'])
    expect(openRows(table)).toEqual(['inv-1'])
  })

  it('keeps ids across server filter responses with local pagination', async () => {
    const data = shallowRef(invoices(1, 5))
    const table = setup({
      data,
      columns,
      getRowId: (row) => row.id,
      manualFiltering: true,
      enableRowExpansion: true,
      defaultExpandedRowIds: ['inv-1'],
    })
    table.setGlobalFilter('Customer 3')
    data.value = invoices(3, 3)
    await nextTick()
    expect(table.expandedRowIds.value).toEqual(['inv-1'])
    table.setGlobalFilter('')
    data.value = invoices(1, 5)
    await nextTick()
    expect(openRows(table)).toEqual(['inv-1'])
  })

  it('still prunes removed source rows in full local mode', async () => {
    const data = shallowRef(invoices(1, 3))
    const table = setup({
      data,
      columns,
      getRowId: (row) => row.id,
      enableRowExpansion: true,
      defaultExpandedRowIds: ['inv-1', 'inv-3'],
    })
    data.value = invoices(2, 3)
    await nextTick()
    expect(table.expandedRowIds.value).toEqual(['inv-3'])
  })
})
