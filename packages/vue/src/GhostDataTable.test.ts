import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type PropType } from 'vue'

import GhostDataTable from './GhostDataTable.vue'
import GhostTable from './GhostTable.vue'
import GhostTableBody from './GhostTableBody.vue'
import GhostTableCell from './GhostTableCell.vue'
import GhostTableHead from './GhostTableHead.vue'
import GhostTableHeaderCell from './GhostTableHeaderCell.vue'
import GhostTableRow from './GhostTableRow.vue'
import type {
  DataTableColumnDef,
  DataTableRowId,
  DataTableStateChangePayload,
  GhostDataTableExposed,
  GhostDataTableSlotProps,
} from './ghost-data-table'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const invoices: Invoice[] = [
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
]

const invoiceColumns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'amount', header: 'Amount', accessorKey: 'amount' },
]

afterEach(() => {
  document.body.innerHTML = ''
})

/** Minimal capture fixture: records the latest slot props for direct calls. */
function mountCapture(props: Record<string, unknown> = {}) {
  let captured: GhostDataTableSlotProps<Invoice> | undefined
  const events = new Map<string, unknown[][]>()
  const record =
    (name: string) =>
    (...args: unknown[]): void => {
      events.set(name, [...(events.get(name) ?? []), args])
    }
  const host = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            GhostDataTable<Invoice>,
            {
              data: invoices,
              columns: invoiceColumns,
              getRowId: (row: Invoice) => row.id,
              'onUpdate:sorting': record('update:sorting'),
              'onUpdate:selectedRowIds': record('update:selectedRowIds'),
              'onUpdate:expandedRowIds': record('update:expandedRowIds'),
              ...props,
            },
            {
              default: (slotProps: GhostDataTableSlotProps<Invoice>) => {
                captured = slotProps
                return h(
                  'span',
                  { class: 'probe' },
                  String(slotProps.rows.length),
                )
              },
            },
          )
      },
    }),
  )
  return {
    host,
    emitted: (name: string): unknown[][] | undefined => events.get(name),
    slot: (): GhostDataTableSlotProps<Invoice> => {
      if (!captured) throw new Error('slot not rendered')
      return captured
    },
  }
}

describe('GhostDataTable renderless root', () => {
  it('renders only the slot content (no wrapper element)', () => {
    const { host } = mountCapture()
    expect(host.html()).toBe('<span class="probe">3</span>')
  })

  it('sets aria-busy and aria-labelledby through tableRootProps', () => {
    const { slot } = mountCapture({ loading: true, ariaLabelledby: 'title' })
    expect(slot().tableRootProps).toEqual({
      'data-ghost-data-table': '',
      'aria-busy': 'true',
      'aria-labelledby': 'title',
    })
  })

  it('renders plain accessor values through getBodyCellContext', () => {
    const { slot } = mountCapture()
    const context = slot().getBodyCellContext('inv-3', 'customer')
    expect(context.getValue()).toBe('Initech')
    expect(context.rowIndex).toBe(2)
    expect(slot().rows[0]?.cells.map((cell) => cell.getValue())).toEqual([
      'ACME Corp',
      1200,
    ])
    expect(() => slot().getBodyCellContext('missing', 'customer')).toThrow(
      /no rendered cell/,
    )
  })

  it('works uncontrolled from default* props and emits update events', async () => {
    const { emitted, slot } = mountCapture({
      enableRowSelection: true,
      enableRowExpansion: true,
      defaultSorting: [{ id: 'amount', desc: false }],
      defaultSelectedRowIds: ['inv-1'],
      defaultPagination: { pageIndex: 1, pageSize: 2 },
    })
    expect(slot().rows.map((row) => row.rowId)).toEqual(['inv-3', 'inv-2'])
    expect(slot().getRowProps('inv-1')).toEqual({ 'data-selected': 'true' })

    slot().rows[0]?.toggleSelected(true)
    slot().rows[0]?.toggleExpanded()
    slot().headers[1]?.toggleSort()
    await nextTick()

    expect(emitted('update:selectedRowIds')).toEqual([[['inv-1', 'inv-3']]])
    expect(emitted('update:expandedRowIds')).toEqual([[['inv-3']]])
    expect(emitted('update:sorting')).toEqual([
      [[{ id: 'amount', desc: true }]],
    ])
    expect(slot().getRowProps('inv-3')).toEqual({
      'data-selected': 'true',
      'data-expanded': 'true',
    })
    expect(slot().headers[1]?.sortDirection).toBe('desc')
  })

  it('makes controls inert and disabled while the table is disabled', async () => {
    const { emitted, slot } = mountCapture({
      disabled: true,
      enableRowSelection: true,
      enableRowExpansion: true,
    })
    expect(slot().getSortButtonProps('amount')).toEqual({
      type: 'button',
      disabled: true,
    })
    expect(slot().getRowSelectionCheckboxProps('inv-1')).toEqual({
      disabled: true,
    })
    expect(slot().getHeaderSelectionCheckboxProps({ label: 'All' })).toEqual({
      disabled: true,
      'aria-label': 'All',
    })
    expect(slot().getRowExpandButtonProps('inv-1')).toEqual({
      type: 'button',
      id: expect.stringMatching(/-expand-sinv-1$/) as unknown,
      'aria-expanded': 'false',
      disabled: true,
    })

    slot().headers[0]?.toggleSort()
    slot().rows[0]?.toggleSelected()
    slot().rows[0]?.toggleExpanded()
    slot().toggleAllRowsSelected(true)
    await nextTick()
    expect(emitted('update:sorting')).toBeUndefined()
    expect(emitted('update:selectedRowIds')).toBeUndefined()
    expect(emitted('update:expandedRowIds')).toBeUndefined()
  })

  it('disables selection and expansion controls when those features are off', () => {
    const { slot } = mountCapture()
    expect(slot().getRowSelectionCheckboxProps('inv-1').disabled).toBe(true)
    expect(slot().getRowExpandButtonProps('inv-1').disabled).toBe(true)
    // Sorting stays available; a column without an accessor cannot sort.
    expect(slot().getSortButtonProps('customer').disabled).toBeUndefined()
    const { slot: unsortable } = mountCapture({
      columns: [{ id: 'actions', header: 'Actions' }],
    })
    expect(unsortable().headers[0]?.canSort).toBe(false)
    expect(unsortable().getSortButtonProps('actions').disabled).toBe(true)
  })

  it('emits one stateChange for a server-sorted header toggle and on retry()', async () => {
    const tableRef = ref<GhostDataTableExposed<Invoice>>()
    const onStateChange =
      vi.fn<(payload: DataTableStateChangePayload) => void>()
    let latest: GhostDataTableSlotProps<Invoice> | undefined
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDataTable<Invoice>,
              {
                ref: tableRef,
                data: invoices,
                columns: invoiceColumns,
                getRowId: (row: Invoice) => row.id,
                manualSorting: true,
                manualPagination: true,
                rowCount: 30,
                onStateChange,
              },
              {
                default: (slotProps: GhostDataTableSlotProps<Invoice>) => {
                  latest = slotProps
                  return null
                },
              },
            )
        },
      }),
    )
    latest?.headers[1]?.toggleSort()
    await nextTick()
    expect(onStateChange).toHaveBeenCalledTimes(1)
    const first = onStateChange.mock.calls[0]?.[0]
    if (!first) throw new Error('missing stateChange')
    expect(first.trigger).toBe('sorting')
    expect(first.query.sorting).toEqual([{ id: 'amount', desc: false }])
    // Server sorting: rows keep server order.
    expect(latest?.rows.map((row) => row.rowId)).toEqual([
      'inv-1',
      'inv-2',
      'inv-3',
    ])

    tableRef.value?.retry()
    expect(onStateChange).toHaveBeenCalledTimes(2)
    expect(onStateChange.mock.calls[1]?.[0].requestId).toBeGreaterThan(
      first.requestId,
    )
  })

  it('exposes row and page actions on the template ref', async () => {
    const tableRef = ref<GhostDataTableExposed<Invoice>>()
    const selected = ref<DataTableRowId[]>([])
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDataTable<Invoice>,
              {
                ref: tableRef,
                data: invoices,
                columns: invoiceColumns,
                getRowId: (row: Invoice) => row.id,
                enableRowSelection: true,
                selectedRowIds: selected.value,
                'onUpdate:selectedRowIds': (next: DataTableRowId[]) => {
                  selected.value = next
                },
                defaultPagination: { pageIndex: 1, pageSize: 2 },
              },
              { default: () => null },
            )
        },
      }),
    )
    const exposed = tableRef.value
    if (!exposed) throw new Error('missing ref')
    exposed.toggleAllRowsSelected(true)
    await nextTick()
    // Local select-all covers every filtered row across pages.
    expect(selected.value).toEqual(['inv-1', 'inv-2', 'inv-3'])
    exposed.resetRowSelection()
    await nextTick()
    expect(selected.value).toEqual([])
    exposed.setPageIndex(2)
    await nextTick()
    expect(exposed.getRowModel().map((row) => row.rowId)).toEqual(['inv-3'])
    expect(exposed.getPrePaginationRowModel()).toHaveLength(3)
  })

  it('does not re-run sort or filter callbacks when selection or expansion toggles', async () => {
    const sortFn = vi.fn((a: Invoice, b: Invoice) => a.amount - b.amount)
    const filterFn = vi.fn(() => true)
    const { slot } = mountCapture({
      columns: [
        { id: 'amount', accessorKey: 'amount', sortFn, filterFn },
      ] satisfies DataTableColumnDef<Invoice>[],
      defaultSorting: [{ id: 'amount', desc: false }],
      defaultColumnFilters: [{ id: 'amount', value: 'x' }],
      enableRowSelection: true,
      enableRowExpansion: true,
    })
    const sortCalls = sortFn.mock.calls.length
    const filterCalls = filterFn.mock.calls.length
    expect(sortCalls).toBeGreaterThan(0)
    slot().rows[0]?.toggleSelected()
    slot().rows[0]?.toggleExpanded()
    await nextTick()
    expect(slot().rows[0]?.isSelected).toBe(true)
    expect(sortFn.mock.calls.length).toBe(sortCalls)
    expect(filterFn.mock.calls.length).toBe(filterCalls)
  })

  it('derives whitespace-free, distinct detail row ids from row ids', () => {
    interface Row {
      id: string | number
    }
    const rows: Row[] = [{ id: 'a b' }, { id: 'a_b' }, { id: 1 }, { id: '1' }]
    let captured: GhostDataTableSlotProps<Row> | undefined
    mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDataTable<Row>,
              {
                data: rows,
                columns: [{ id: 'id', accessorKey: 'id' }],
                getRowId: (row: Row) => row.id,
                enableRowExpansion: true,
                defaultExpandedRowIds: ['a b', 'a_b', 1, '1'],
              },
              {
                default: (slotProps: GhostDataTableSlotProps<Row>) => {
                  captured = slotProps
                  return null
                },
              },
            )
        },
      }),
    )
    const ids = captured?.rows.map((row) => row.detailRowProps.id) ?? []
    expect(new Set(ids).size).toBe(4)
    for (const id of ids) expect(id).not.toMatch(/\s/)
    expect(captured?.getRowExpandButtonProps('a b')['aria-controls']).toBe(
      ids[0],
    )
  })

  it('composes with GhostTable parts from a render function', () => {
    const Fixture = defineComponent({
      props: {
        loading: { type: Boolean as PropType<boolean>, default: false },
      },
      setup(props) {
        return () =>
          h(
            GhostDataTable<Invoice>,
            {
              data: invoices,
              columns: invoiceColumns,
              getRowId: (row: Invoice) => row.id,
              loading: props.loading,
              ariaLabel: 'Invoices',
            },
            {
              default: (slot: GhostDataTableSlotProps<Invoice>) =>
                h(GhostTable, slot.tableRootProps, () => [
                  h(GhostTableHead, () =>
                    h(GhostTableRow, () =>
                      slot.headers.map((header) =>
                        h(
                          GhostTableHeaderCell,
                          {
                            key: header.id,
                            ...slot.getHeaderCellProps(header.id),
                          },
                          () => header.column.header,
                        ),
                      ),
                    ),
                  ),
                  h(GhostTableBody, () =>
                    slot.rows.map((row) =>
                      h(
                        GhostTableRow,
                        { key: row.rowId, ...slot.getRowProps(row.rowId) },
                        () =>
                          row.cells.map((cell) =>
                            h(GhostTableCell, { key: cell.column.id }, () =>
                              String(cell.getValue()),
                            ),
                          ),
                      ),
                    ),
                  ),
                ]),
            },
          )
      },
    })
    const wrapper = mount(Fixture, { props: { loading: true } })
    expect(wrapper.get('table').attributes('aria-busy')).toBe('true')
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.get('tbody td').text()).toBe('ACME Corp')
  })
})

describe('GhostDataTable focus on detail collapse', () => {
  /**
   * Expand buttons per row and, inside each open detail row, a "Hide" button
   * that collapses its own row and a "Next" button that opens the next row
   * (to collapse this one with `allowMultipleExpanded: false`).
   */
  function mountFocusFixture(props: Record<string, unknown> = {}) {
    const globalFilter = ref('')
    const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDataTable<Invoice>,
              {
                data: invoices,
                columns: invoiceColumns,
                getRowId: (row: Invoice) => row.id,
                enableRowExpansion: true,
                globalFilter: globalFilter.value,
                expandedRowIds: expandedRowIds.value,
                'onUpdate:expandedRowIds': (next: DataTableRowId[]) => {
                  expandedRowIds.value = next
                },
                ...props,
              },
              {
                default: (slot: GhostDataTableSlotProps<Invoice>) =>
                  h(
                    'div',
                    slot.rows.flatMap((row, index) => [
                      h(
                        'button',
                        {
                          key: `${String(row.rowId)}-expand`,
                          ...slot.getRowExpandButtonProps(row.rowId, {
                            label: `Show details for ${String(row.rowId)}`,
                          }),
                          onClick: row.toggleExpanded,
                        },
                        'Details',
                      ),
                      row.isExpanded
                        ? h(
                            'div',
                            {
                              key: `${String(row.rowId)}-detail`,
                              ...row.detailRowProps,
                            },
                            [
                              h(
                                'button',
                                {
                                  type: 'button',
                                  class: 'hide',
                                  onClick: row.toggleExpanded,
                                },
                                'Hide',
                              ),
                              h(
                                'button',
                                {
                                  type: 'button',
                                  class: 'next',
                                  onClick: () =>
                                    slot.rows[index + 1]?.toggleExpanded(),
                                },
                                'Next',
                              ),
                            ],
                          )
                        : null,
                    ]),
                  ),
              },
            )
        },
      }),
      { attachTo: document.body },
    )
    const expandButton = (rowId: string): HTMLElement => {
      const button = wrapper.find(
        `button[aria-label="Show details for ${rowId}"]`,
      )
      return button.element as HTMLElement
    }
    return { wrapper, expandButton, expandedRowIds, globalFilter }
  }

  async function settle(): Promise<void> {
    await nextTick()
    await nextTick()
  }

  it('moves focus to the expand button when the focused detail row collapses', async () => {
    const { wrapper, expandButton, expandedRowIds } = mountFocusFixture()
    const hide = wrapper.get('[data-detail-row] .hide')
    ;(hide.element as HTMLElement).focus()
    await hide.trigger('click')
    await settle()
    expect(expandedRowIds.value).toEqual([])
    expect(wrapper.find('[data-detail-row]').exists()).toBe(false)
    expect(document.activeElement).toBe(expandButton('inv-2'))
    expect(expandButton('inv-2').getAttribute('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('restores focus after a programmatic collapse of the focused detail row', async () => {
    const { wrapper, expandButton, expandedRowIds } = mountFocusFixture()
    ;(wrapper.get('[data-detail-row] .next').element as HTMLElement).focus()
    expandedRowIds.value = []
    await settle()
    expect(document.activeElement).toBe(expandButton('inv-2'))
    wrapper.unmount()
  })

  it('restores focus when allowMultipleExpanded closes the focused detail row', async () => {
    const { wrapper, expandButton, expandedRowIds } = mountFocusFixture({
      allowMultipleExpanded: false,
    })
    const next = wrapper.get('[data-detail-row] .next')
    ;(next.element as HTMLElement).focus()
    await next.trigger('click')
    await settle()
    expect(expandedRowIds.value).toEqual(['inv-3'])
    expect(document.activeElement).toBe(expandButton('inv-2'))
    wrapper.unmount()
  })

  it('leaves focus alone when it is outside the collapsing detail row', async () => {
    const { wrapper, expandButton } = mountFocusFixture()
    const inv2 = expandButton('inv-2')
    inv2.focus()
    inv2.click()
    await settle()
    expect(document.activeElement).toBe(inv2)

    const inv1 = expandButton('inv-1')
    inv1.click()
    await settle()
    // Collapsing inv-1 while focus sits on inv-2's button does not move it.
    inv2.focus()
    inv1.click()
    await settle()
    expect(document.activeElement).toBe(inv2)
    wrapper.unmount()
  })

  it('does not move focus when the row itself leaves the view', async () => {
    const { wrapper, globalFilter } = mountFocusFixture()
    const hide = wrapper.get('[data-detail-row] .hide')
    ;(hide.element as HTMLElement).focus()
    globalFilter.value = 'acme'
    await settle()
    expect(wrapper.find('[data-detail-row]').exists()).toBe(false)
    expect(
      wrapper.find('button[aria-label="Show details for inv-2"]').exists(),
    ).toBe(false)
    // No expand button left to return to: focus is not moved anywhere.
    expect(document.activeElement).toBe(document.body)
    wrapper.unmount()
  })
})
