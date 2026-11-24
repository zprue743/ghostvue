import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef } from 'vue'

import GhostDataTable from './GhostDataTable.vue'
import GhostTable from './GhostTable.vue'
import GhostTableBody from './GhostTableBody.vue'
import GhostTableCell from './GhostTableCell.vue'
import GhostTableRow from './GhostTableRow.vue'
import type {
  DataTableColumnDef,
  DataTableColumnSort,
  DataTableRowId,
  GhostDataTableSlotProps,
} from './ghost-data-table'

/*
 * Detail rows (GHO-244; spec "State model → Expansion"): an expanded row
 * renders its detail `<tr>` immediately after its data `<tr>`, built from
 * `GhostTableRow` with `detailRowProps`, and the pairing follows the row id
 * through sort, reorder, and server page swaps.
 */

interface Invoice {
  id: string
  customer: string
  amount: number
}

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    enableSorting: true,
  },
]

const page = (from: number, to: number): Invoice[] => {
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

afterEach(() => {
  document.body.innerHTML = ''
})

function mountTable(props: Record<string, unknown> = {}) {
  const data = shallowRef(page(1, 3))
  const sorting = ref<DataTableColumnSort[]>([])
  const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            GhostDataTable<Invoice>,
            {
              data: data.value,
              columns,
              getRowId: (row: Invoice) => row.id,
              enableRowExpansion: true,
              sorting: sorting.value,
              'onUpdate:sorting': (next: DataTableColumnSort[]) => {
                sorting.value = next
              },
              expandedRowIds: expandedRowIds.value,
              'onUpdate:expandedRowIds': (next: DataTableRowId[]) => {
                expandedRowIds.value = next
              },
              ...props,
            },
            {
              default: (slot: GhostDataTableSlotProps<Invoice>) =>
                h(GhostTable, slot.tableRootProps, () =>
                  h(GhostTableBody, null, () =>
                    slot.rows.flatMap((row) => [
                      h(
                        GhostTableRow,
                        {
                          key: `${String(row.rowId)}-data`,
                          'data-row-id': row.rowId,
                          ...slot.getRowProps(row.rowId),
                        },
                        () => [
                          h(GhostTableCell, null, () =>
                            h(
                              'button',
                              {
                                ...slot.getRowExpandButtonProps(row.rowId, {
                                  label: `Show details for ${String(row.rowId)}`,
                                }),
                                onClick: row.toggleExpanded,
                              },
                              'Details',
                            ),
                          ),
                          h(GhostTableCell, null, () => row.row.customer),
                        ],
                      ),
                      row.isExpanded
                        ? h(
                            GhostTableRow,
                            {
                              key: `${String(row.rowId)}-detail`,
                              ...row.detailRowProps,
                            },
                            () =>
                              h(
                                GhostTableCell,
                                { colspan: 2 },
                                () => `Details for ${String(row.rowId)}`,
                              ),
                          )
                        : null,
                    ]),
                  ),
                ),
            },
          )
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, data, sorting, expandedRowIds }
}

/**
 * Body rows in DOM order: data rows as their id, detail rows as
 * `detail:<text>`, so one assertion covers both content and placement.
 */
function bodyOrder(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper
    .findAll('tbody > tr')
    .map((tr) =>
      tr.attributes('data-detail-row') === 'true'
        ? `detail:${tr.text()}`
        : (tr.attributes('data-row-id') ?? '?'),
    )
}

describe('GhostDataTable detail rows', () => {
  it('renders the detail <tr> immediately after its data <tr>', () => {
    const { wrapper } = mountTable()
    expect(bodyOrder(wrapper)).toEqual([
      'inv-1',
      'inv-2',
      'detail:Details for inv-2',
      'inv-3',
    ])
    const detail = wrapper.get('tr[data-detail-row]')
    // GhostTableRow keeps its own part; the detail hook is additive.
    expect(detail.attributes('data-part')).toBe('row')
    expect(detail.classes()).toContain('ghost-table-row')
    const dataRow = wrapper.get('tr[data-row-id="inv-2"]')
    expect(dataRow.attributes('data-expanded')).toBe('true')
    const button = dataRow.get('button')
    expect(button.attributes('aria-label')).toBe('Show details for inv-2')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(button.attributes('aria-controls')).toBe(detail.attributes('id'))
  })

  it('opens and closes detail rows from the labeled button', async () => {
    const { wrapper, expandedRowIds } = mountTable()
    await wrapper
      .get('button[aria-label="Show details for inv-3"]')
      .trigger('click')
    expect(expandedRowIds.value).toEqual(['inv-2', 'inv-3'])
    expect(bodyOrder(wrapper)).toEqual([
      'inv-1',
      'inv-2',
      'detail:Details for inv-2',
      'inv-3',
      'detail:Details for inv-3',
    ])
    await wrapper
      .get('button[aria-label="Show details for inv-2"]')
      .trigger('click')
    expect(expandedRowIds.value).toEqual(['inv-3'])
    const inv2 = wrapper.get('button[aria-label="Show details for inv-2"]')
    expect(inv2.attributes('aria-expanded')).toBe('false')
    expect(inv2.attributes('aria-controls')).toBeUndefined()
    expect(
      wrapper.get('tr[data-row-id="inv-2"]').attributes('data-expanded'),
    ).toBeUndefined()
  })

  it('moves the detail <tr> with its row on sort and data reorder', async () => {
    const { wrapper, sorting, data } = mountTable()
    sorting.value = [{ id: 'amount', desc: true }]
    await nextTick()
    expect(bodyOrder(wrapper)).toEqual([
      'inv-3',
      'inv-2',
      'detail:Details for inv-2',
      'inv-1',
    ])

    sorting.value = []
    data.value = [
      { id: 'inv-0', customer: 'Customer 0', amount: 0 },
      ...page(1, 3).reverse(),
    ]
    await nextTick()
    expect(bodyOrder(wrapper)).toEqual([
      'inv-0',
      'inv-3',
      'inv-2',
      'detail:Details for inv-2',
      'inv-1',
    ])
  })

  it('re-renders the detail <tr> after a server page round trip', async () => {
    const { wrapper, data, expandedRowIds } = mountTable({
      manualPagination: true,
      rowCount: 6,
      defaultPagination: { pageIndex: 1, pageSize: 3 },
    })
    data.value = page(4, 6)
    await nextTick()
    expect(wrapper.find('tr[data-detail-row]').exists()).toBe(false)
    expect(expandedRowIds.value).toEqual(['inv-2'])

    data.value = page(1, 3)
    await nextTick()
    expect(bodyOrder(wrapper)).toEqual([
      'inv-1',
      'inv-2',
      'detail:Details for inv-2',
      'inv-3',
    ])
  })
})
