import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, effectScope, h, nextTick } from 'vue'
import { bench, describe } from 'vitest'

import GhostTable from '../../packages/vue/src/GhostTable.vue'
import GhostTableBody from '../../packages/vue/src/GhostTableBody.vue'
import GhostTableCell from '../../packages/vue/src/GhostTableCell.vue'
import GhostTableHead from '../../packages/vue/src/GhostTableHead.vue'
import GhostTableHeaderCell from '../../packages/vue/src/GhostTableHeaderCell.vue'
import GhostTableRow from '../../packages/vue/src/GhostTableRow.vue'
import {
  filterRows,
  getCellValue,
  sortRows,
} from '../../packages/vue/src/data-table-processing'
import type {
  DataTableColumnDef,
  DataTableColumnSort,
  DataTableRow,
  UseGhostDataTableReturn,
} from '../../packages/vue/src/ghost-data-table'
import { useGhostDataTable } from '../../packages/vue/src/use-ghost-data-table'

/*
 * GHO-240: DataTable local-processing bench (spec §Performance).
 *
 * Informational only. Not part of `pnpm verify` or CI: timings depend on the
 * host, and the spec's proposed thresholds (p95 < 25ms, heap delta < 5MB per
 * 10k-row operation) stay informational until repeated CI runs show the
 * variance (spec open question 2). Run with `pnpm bench:data-table` and
 * compare a change against `master` on the same machine. `vitest bench`
 * reports time only; the heap figure is not measured here because a stable
 * heap delta needs a forced GC (`--expose-gc`). The deterministic
 * "page change does not re-sort" and "selection does not re-run sort/filter"
 * guards are unit tests (`use-ghost-data-table.counters.test.ts`), not timings.
 *
 * Three layers, each at 1k / 5k / 10k rows:
 *
 * - "stages" calls the pure sort and filter stages, isolating the comparator
 *   and filter cost from Vue reactivity.
 * - "pipeline" drives `useGhostDataTable` through one user action and reads
 *   the paginated row model, as a render would: re-sort, filter keystroke,
 *   page change, and selection toggle.
 * - "mounted" renders a `GhostTable` in jsdom with only the current page in
 *   the DOM (O(pageSize) rows, never 10k `<tr>`s) and measures a sort or page
 *   change through to the re-render.
 */

const SIZES = [1000, 5000, 10_000] as const
const PAGE_SIZE = 25

interface Invoice {
  id: string
  customer: string
  amount: number
  issuedAt: Date
}

// The spec's comparison scenario: three columns (string, number, date).
const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'amount', header: 'Amount', accessorKey: 'amount' },
  { id: 'issuedAt', header: 'Issued', accessorKey: 'issuedAt' },
]

const columnsById = new Map(columns.map((column) => [column.id, column]))

const DAY = 86_400_000

/** Deterministic, scrambled rows so sorts really reorder the input. */
function invoices(count: number): Invoice[] {
  return Array.from({ length: count }, (_, index) => {
    const scrambled = (index * 7919) % count
    return {
      id: `inv-${String(index + 1)}`,
      customer: `Customer ${String(scrambled)}`,
      amount: Math.round(((scrambled * 37) % 100_000) * 1.25) / 100,
      issuedAt: new Date(Date.UTC(2026, 0, 1) + (scrambled % 365) * DAY),
    }
  })
}

const getRowId = (row: Invoice): string => row.id

function coreRows(data: Invoice[]): DataTableRow<Invoice>[] {
  return data.map((row, rowIndex) => ({ row, rowId: row.id, rowIndex }))
}

function column(id: string): DataTableColumnDef<Invoice> {
  const found = columnsById.get(id)
  if (!found) throw new Error(`unknown column ${id}`)
  return found
}

/** The rendered page must stay O(pageSize); a bench that drifted into
 * rendering everything would measure the wrong thing. */
function expectPage(rows: readonly unknown[]): void {
  if (rows.length !== PAGE_SIZE) {
    throw new Error(
      `expected ${String(PAGE_SIZE)} rows, got ${String(rows.length)}`,
    )
  }
}

describe.each(SIZES)('stages: %i rows', (count) => {
  const rows = coreRows(invoices(count))

  bench('sort by string (locale collator)', () => {
    sortRows(rows, { id: 'customer', desc: false }, column('customer'))
  })

  bench('sort by number', () => {
    sortRows(rows, { id: 'amount', desc: true }, column('amount'))
  })

  bench('sort by date', () => {
    sortRows(rows, { id: 'issuedAt', desc: false }, column('issuedAt'))
  })

  bench('global text filter (OR across columns)', () => {
    filterRows(rows, columns, columnsById, 'customer 12', [])
  })

  bench('column text filter', () => {
    filterRows(rows, columns, columnsById, undefined, [
      { id: 'customer', value: '99' },
    ])
  })
})

function pipelineTable(count: number): UseGhostDataTableReturn<Invoice> {
  // Never stopped: one table per size lives for the whole bench process.
  const table = effectScope().run(() =>
    useGhostDataTable({
      data: invoices(count),
      columns,
      getRowId,
      enableRowSelection: true,
      defaultSorting: [{ id: 'customer', desc: false }],
      defaultPagination: { pageIndex: 1, pageSize: PAGE_SIZE },
    }),
  )
  if (!table) throw new Error('useGhostDataTable did not run')
  expectPage(table.getRowModel())
  return table
}

describe.each(SIZES)('pipeline: %i rows', (count) => {
  const sortTable = pipelineTable(count)
  let desc = false
  bench('sort change → page model', () => {
    desc = !desc
    sortTable.setSorting([{ id: 'amount', desc }])
    expectPage(sortTable.getRowModel())
  })

  const filterTable = pipelineTable(count)
  // Alternate two keystrokes so every iteration changes the filter.
  const needles = ['customer 1', 'customer']
  let keystroke = 0
  bench('global filter keystroke (sorted) → page model', () => {
    keystroke += 1
    filterTable.setGlobalFilter(needles[keystroke % needles.length])
    expectPage(filterTable.getRowModel())
  })

  const pageTable = pipelineTable(count)
  let page = 1
  bench('page change (sorted) → page model', () => {
    page = (page % pageTable.pageCount.value) + 1
    pageTable.setPageIndex(page)
    expectPage(pageTable.getRowModel())
  })

  const selectTable = pipelineTable(count)
  bench('toggle one row selection (sorted) → header state', () => {
    const first = selectTable.getRowModel()[0]
    if (!first) throw new Error('expected a visible row')
    selectTable.toggleRowSelected(first.rowId)
    void selectTable.headerSelectionState.value
  })
})

interface MountedTable {
  wrapper: VueWrapper
  table: UseGhostDataTableReturn<Invoice>
}

/** Minimal consumer composition: native GhostTable, current page only. */
function mountTable(count: number): MountedTable {
  let table: UseGhostDataTableReturn<Invoice> | undefined
  const Fixture = defineComponent({
    setup() {
      const local = useGhostDataTable({
        data: invoices(count),
        columns,
        getRowId,
        defaultSorting: [{ id: 'customer', desc: false }],
        defaultPagination: { pageIndex: 1, pageSize: PAGE_SIZE },
      })
      table = local
      return () =>
        h(GhostTable, { 'aria-label': 'Invoices' }, () => [
          h(GhostTableHead, null, () =>
            h(GhostTableRow, null, () =>
              columns.map((col) =>
                h(GhostTableHeaderCell, { key: col.id }, () => col.header),
              ),
            ),
          ),
          h(GhostTableBody, null, () =>
            local
              .getRowModel()
              .map((entry) =>
                h(GhostTableRow, { key: entry.rowId }, () =>
                  columns.map((col) =>
                    h(GhostTableCell, { key: col.id }, () =>
                      String(getCellValue(col, entry.row, entry.rowIndex)),
                    ),
                  ),
                ),
              ),
          ),
        ])
    },
  })
  const wrapper = mount(Fixture, { attachTo: document.body })
  if (!table) throw new Error('fixture did not create a table')
  return { wrapper, table }
}

function expectRenderedPage(wrapper: VueWrapper): void {
  expectPage(wrapper.findAll('tbody tr'))
}

describe.each(SIZES)('mounted: %i rows (25-row page)', (count) => {
  const sorted = mountTable(count)
  const sorts: DataTableColumnSort[][] = [
    [{ id: 'amount', desc: false }],
    [{ id: 'amount', desc: true }],
  ]
  let sortStep = 0
  bench('sort change → re-render page', async () => {
    sortStep += 1
    sorted.table.setSorting(sorts[sortStep % sorts.length] ?? [])
    await nextTick()
    expectRenderedPage(sorted.wrapper)
  })

  const paged = mountTable(count)
  let page = 1
  bench('page change (sorted) → re-render page', async () => {
    page = (page % paged.table.pageCount.value) + 1
    paged.table.setPageIndex(page)
    await nextTick()
    expectRenderedPage(paged.wrapper)
  })
})
