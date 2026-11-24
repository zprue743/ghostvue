import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'

import GhostCheckbox from './GhostCheckbox.vue'
import GhostDataTable from './GhostDataTable.vue'
import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTablePaginationState,
  DataTableRowId,
  GhostDataTableExposed,
  GhostDataTableSlotProps,
} from './ghost-data-table'

/*
 * Row selection through the GhostDataTable root (GHO-243; spec "Select-all
 * behavior", "State model → Selection", and the selection rows of "Decisions
 * recorded"). Every scenario drives labelled GhostCheckbox inputs the way a
 * consumer template would and observes the `v-model:selected-row-ids` value,
 * so the composable rules are checked through the public slot bindings rather
 * than the internal row models.
 */

interface Invoice {
  id: string
  customer: string
  status: 'match' | 'other'
}

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'status', header: 'Status', accessorKey: 'status' },
]

/** `count` invoices; `isMatch(index)` decides which rows a status filter keeps. */
function invoices(
  count: number,
  isMatch: (index: number) => boolean = () => false,
  offset = 0,
): Invoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `inv-${String(offset + index + 1)}`,
    customer: `Customer ${String(offset + index + 1)}`,
    status: isMatch(index) ? 'match' : 'other',
  }))
}

interface MountOptions {
  data: Invoice[]
  tableProps?: Record<string, unknown>
  selected?: DataTableRowId[]
  pagination?: DataTablePaginationState
}

function mountSelection(options: MountOptions) {
  const data = shallowRef(options.data)
  const selected = ref<DataTableRowId[]>(options.selected ?? [])
  const columnFilters = ref<DataTableColumnFilter[]>([])
  const pagination = ref<DataTablePaginationState>(
    options.pagination ?? { pageIndex: 1, pageSize: 25 },
  )
  const table = ref<GhostDataTableExposed<Invoice>>()

  const Host = defineComponent({
    setup() {
      return () =>
        h(
          GhostDataTable<Invoice>,
          {
            ref: table,
            data: data.value,
            columns,
            getRowId: (row: Invoice) => row.id,
            enableRowSelection: true,
            selectedRowIds: selected.value,
            'onUpdate:selectedRowIds': (next: DataTableRowId[]) => {
              selected.value = next
            },
            columnFilters: columnFilters.value,
            'onUpdate:columnFilters': (next: DataTableColumnFilter[]) => {
              columnFilters.value = next
            },
            pagination: pagination.value,
            'onUpdate:pagination': (next: DataTablePaginationState) => {
              pagination.value = next
            },
            ...options.tableProps,
          },
          {
            default: (slot: GhostDataTableSlotProps<Invoice>) =>
              h('div', [
                h(GhostCheckbox, {
                  ...slot.getHeaderSelectionCheckboxProps({
                    label: 'Select all invoices matching filters',
                  }),
                  modelValue: slot.headerSelectionState.allSelected,
                  indeterminate: slot.headerSelectionState.someSelected,
                  'onUpdate:modelValue': slot.toggleAllRowsSelected,
                }),
                ...slot.rows.map((row) =>
                  h(GhostCheckbox, {
                    key: row.rowId,
                    ...slot.getRowSelectionCheckboxProps(row.rowId, {
                      label: `Select invoice ${String(row.rowId)}`,
                    }),
                    modelValue: row.isSelected,
                    'onUpdate:modelValue': row.toggleSelected,
                  }),
                ),
              ]),
          },
        )
    },
  })

  const wrapper = mount(Host, { attachTo: document.body })

  const exposed = (): GhostDataTableExposed<Invoice> => {
    if (!table.value) throw new Error('table ref not set')
    return table.value
  }
  const headerCheckbox = () =>
    wrapper.get<HTMLInputElement>(
      'input[aria-label="Select all invoices matching filters"]',
    )
  const rowCheckbox = (rowId: string) =>
    wrapper.get<HTMLInputElement>(`input[aria-label="Select invoice ${rowId}"]`)
  const visibleRowIds = (): string[] =>
    wrapper
      .findAll('input[aria-label^="Select invoice "]')
      .map((input) =>
        (input.attributes('aria-label') ?? '').replace('Select invoice ', ''),
      )

  return {
    wrapper,
    data,
    selected,
    pagination,
    exposed,
    headerCheckbox,
    rowCheckbox,
    visibleRowIds,
    async filterStatus(value: string | undefined): Promise<void> {
      exposed().setColumnFilter('status', value)
      await nextTick()
    },
    async goToPage(pageIndex: number): Promise<void> {
      exposed().setPageIndex(pageIndex)
      await nextTick()
    },
  }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('GhostDataTable row selection: local select-all', () => {
  it('selects all 40 filter matches across pages (100 rows, page size 25)', async () => {
    // Indices 0, 1, 5, 6, 10, 11, ... match: 40 of 100 rows.
    const table = mountSelection({
      data: invoices(100, (index) => index % 5 < 2),
    })
    await table.filterStatus('match')
    expect(table.visibleRowIds()).toHaveLength(25)
    expect(table.headerCheckbox().element.checked).toBe(false)

    await table.headerCheckbox().setValue(true)
    expect(table.selected.value).toHaveLength(40)
    // Matches on page 2 are selected even though they were never rendered.
    expect(table.selected.value).toContain('inv-97')
    expect(table.selected.value).not.toContain('inv-3')
    expect(table.headerCheckbox().element.checked).toBe(true)
    expect(table.headerCheckbox().element.indeterminate).toBe(false)

    await table.goToPage(2)
    expect(table.visibleRowIds()).toHaveLength(15)
    expect(table.rowCheckbox('inv-97').element.checked).toBe(true)
    expect(table.selected.value).toHaveLength(40)

    // Clearing the filter widens the target to 100: 40 of 100 is mixed.
    await table.filterStatus(undefined)
    expect(table.selected.value).toHaveLength(40)
    expect(table.headerCheckbox().element.indeterminate).toBe(true)
  })

  it('deselect-all removes only the filtered target and keeps hidden picks', async () => {
    const table = mountSelection({
      data: invoices(100, (index) => index % 5 < 2),
      selected: ['inv-3'],
    })
    await table.filterStatus('match')
    await table.headerCheckbox().setValue(true)
    expect(table.selected.value).toHaveLength(41)

    await table.headerCheckbox().setValue(false)
    // inv-3 does not match the filter, so it is outside the target.
    expect(table.selected.value).toEqual(['inv-3'])
  })
})

describe('GhostDataTable row selection: server select-all', () => {
  it('selects only the 3 visible rows of a 25-row server page', async () => {
    const table = mountSelection({
      data: invoices(25, (index) => index < 3, 25),
      selected: ['inv-1'],
      pagination: { pageIndex: 2, pageSize: 25 },
      tableProps: { manualPagination: true, rowCount: 250 },
    })
    await table.filterStatus('match')
    expect(table.visibleRowIds()).toEqual(['inv-26', 'inv-27', 'inv-28'])
    // inv-1 lives on page 1: it is not part of this page's header state.
    expect(table.headerCheckbox().element.indeterminate).toBe(false)

    await table.headerCheckbox().setValue(true)
    expect(table.selected.value).toEqual([
      'inv-1',
      'inv-26',
      'inv-27',
      'inv-28',
    ])

    await table.filterStatus(undefined)
    expect(table.visibleRowIds()).toHaveLength(25)
    expect(table.selected.value).toEqual([
      'inv-1',
      'inv-26',
      'inv-27',
      'inv-28',
    ])
    expect(table.headerCheckbox().element.indeterminate).toBe(true)

    // Deselect-all on the page keeps the cross-page id.
    await table.headerCheckbox().setValue(true)
    await table.headerCheckbox().setValue(false)
    expect(table.selected.value).toEqual(['inv-1'])
  })

  it('treats a server-filtered page as the whole select-all target', async () => {
    const table = mountSelection({
      data: invoices(3),
      tableProps: {
        manualPagination: true,
        manualFiltering: true,
        rowCount: 30,
      },
    })
    await table.headerCheckbox().setValue(true)
    expect(table.selected.value).toEqual(['inv-1', 'inv-2', 'inv-3'])
  })
})

describe('GhostDataTable row selection: cross-page server selection', () => {
  it('keeps row A from page 1 and row B from page 2 (pages 1 → 2 → 1)', async () => {
    const pageOne = invoices(5)
    const pageTwo = invoices(5, undefined, 5)
    const table = mountSelection({
      data: pageOne,
      pagination: { pageIndex: 1, pageSize: 5 },
      tableProps: { manualPagination: true, rowCount: 10 },
    })

    await table.rowCheckbox('inv-2').setValue(true)
    expect(table.selected.value).toEqual(['inv-2'])

    await table.goToPage(2)
    table.data.value = pageTwo
    await nextTick()
    expect(table.visibleRowIds()).toEqual([
      'inv-6',
      'inv-7',
      'inv-8',
      'inv-9',
      'inv-10',
    ])
    // A new server page never prunes ids it does not contain.
    expect(table.selected.value).toEqual(['inv-2'])
    expect(table.headerCheckbox().element.indeterminate).toBe(false)
    await table.rowCheckbox('inv-9').setValue(true)

    await table.goToPage(1)
    table.data.value = pageOne
    await nextTick()
    expect(table.rowCheckbox('inv-2').element.checked).toBe(true)
    expect(table.selected.value).toEqual(['inv-2', 'inv-9'])
    expect(
      table
        .exposed()
        .getSelectedRowModel()
        .map((row) => row.rowId),
    ).toEqual(['inv-2'])
  })
})

describe('GhostDataTable row selection: pruning', () => {
  const sample: Invoice[] = [
    { id: 'inv-1', customer: 'ACME Corp', status: 'match' },
    { id: 'inv-2', customer: 'Globex', status: 'other' },
    { id: 'inv-3', customer: 'Initech', status: 'other' },
  ]

  it('prunes against source data, not the filtered view (full local mode)', async () => {
    const table = mountSelection({ data: sample })
    await table.rowCheckbox('inv-1').setValue(true)

    // Filter A out of view, then refresh `data` with A still present.
    await table.filterStatus('other')
    expect(table.visibleRowIds()).toEqual(['inv-2', 'inv-3'])
    table.data.value = sample.map((row) => ({ ...row }))
    await nextTick()

    await table.filterStatus(undefined)
    expect(table.selected.value).toEqual(['inv-1'])
    expect(table.rowCheckbox('inv-1').element.checked).toBe(true)

    // A refresh that drops A from the source prunes it.
    table.data.value = sample.slice(1)
    await nextTick()
    expect(table.selected.value).toEqual([])
  })

  it('still prunes when only sorting is manual', async () => {
    const table = mountSelection({
      data: sample,
      selected: ['inv-1', 'inv-2'],
      tableProps: { manualSorting: true },
    })
    table.data.value = sample.slice(1)
    await nextTick()
    expect(table.selected.value).toEqual(['inv-2'])
  })

  it.each([
    ['manualPagination', { manualPagination: true, rowCount: 30 }],
    ['manualFiltering', { manualFiltering: true }],
    [
      'manualPagination + manualFiltering',
      { manualPagination: true, manualFiltering: true, rowCount: 30 },
    ],
  ])('never prunes with %s', async (_label, tableProps) => {
    const table = mountSelection({
      data: sample,
      selected: ['inv-1', 'inv-2'],
      tableProps,
    })
    table.data.value = sample.slice(2)
    await nextTick()
    table.data.value = []
    await nextTick()
    expect(table.selected.value).toEqual(['inv-1', 'inv-2'])
  })
})
