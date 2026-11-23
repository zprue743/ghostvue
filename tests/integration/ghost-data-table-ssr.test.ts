import { computed, defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import FullInvoices from '../../examples/data-table/full-invoices.vue'
import GhostDataTable from '../../packages/vue/src/GhostDataTable.vue'
import GhostPagination from '../../packages/vue/src/GhostPagination.vue'
import GhostTable from '../../packages/vue/src/GhostTable.vue'
import GhostTableBody from '../../packages/vue/src/GhostTableBody.vue'
import GhostTableCell from '../../packages/vue/src/GhostTableCell.vue'
import GhostTableHead from '../../packages/vue/src/GhostTableHead.vue'
import GhostTableHeaderCell from '../../packages/vue/src/GhostTableHeaderCell.vue'
import GhostTableRow from '../../packages/vue/src/GhostTableRow.vue'
import type {
  DataTableColumnDef,
  DataTableColumnSort,
  DataTablePaginationState,
  GhostDataTableSlotProps,
} from '../../packages/vue/src/ghost-data-table'
import { expectSsrHydration } from '../support/ssr-hydration'

interface Invoice {
  id: string
  customer: string
  amount: number
}

/*
 * Closest available version of spec example (a): sort + paginate + a currency
 * cell. GhostDataTableTable and defineDataTableColumns ship in later issues
 * (GHO-241, GHO-234), so the table shell is composed from the root's slot
 * bindings here.
 */
const BasicInvoices = defineComponent({
  setup() {
    const columns: DataTableColumnDef<Invoice>[] = [
      { id: 'customer', header: 'Customer', accessorKey: 'customer' },
      { id: 'amount', header: 'Amount', accessorKey: 'amount' },
    ]
    const data = ref<Invoice[]>([
      { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
      { id: 'inv-2', customer: 'Globex', amount: 980.5 },
    ])
    const pagination = ref<DataTablePaginationState>({
      pageIndex: 1,
      pageSize: 25,
    })
    const sorting = ref<DataTableColumnSort[]>([{ id: 'amount', desc: false }])
    const pageCount = computed(() =>
      Math.max(1, Math.ceil(data.value.length / pagination.value.pageSize)),
    )

    return () =>
      h(
        GhostDataTable<Invoice>,
        {
          data: data.value,
          columns,
          getRowId: (row: Invoice) => row.id,
          pagination: pagination.value,
          'onUpdate:pagination': (next: DataTablePaginationState) => {
            pagination.value = next
          },
          sorting: sorting.value,
          'onUpdate:sorting': (next: DataTableColumnSort[]) => {
            sorting.value = next
          },
        },
        {
          default: (slot: GhostDataTableSlotProps<Invoice>) => [
            h(GhostTable, slot.tableRootProps, () => [
              h(GhostTableHead, () =>
                h(GhostTableRow, () =>
                  slot.headers.map((header) =>
                    h(
                      GhostTableHeaderCell,
                      { key: header.id, ...slot.getHeaderCellProps(header.id) },
                      () =>
                        h(
                          'button',
                          {
                            ...slot.getSortButtonProps(header.id),
                            onClick: header.toggleSort,
                          },
                          header.column.header,
                        ),
                    ),
                  ),
                ),
              ),
              h(GhostTableBody, () =>
                slot.rows.map((row) =>
                  h(GhostTableRow, { key: row.rowId }, () => [
                    h(GhostTableCell, () => row.row.customer),
                    h(GhostTableCell, () => `${row.row.amount.toFixed(2)} USD`),
                  ]),
                ),
              ),
            ]),
            h(GhostPagination, {
              modelValue: pagination.value.pageIndex,
              pageCount: pageCount.value,
            }),
          ],
        },
      )
  },
})

describe('GhostDataTable SSR hydration', () => {
  it('hydrates the basic (a) sort + paginate composition', async () => {
    await expectSsrHydration(BasicInvoices, {
      assertServerHtml(html) {
        expect(html).toContain('data-ghost-data-table')
        expect(html).toContain('aria-sort="ascending"')
        expect(html).toContain('data-sort="asc"')
        expect(html).toContain('980.50 USD')
        // Ascending by amount: Globex renders before ACME Corp.
        expect(html.indexOf('Globex')).toBeLessThan(html.indexOf('ACME Corp'))
        expect(html).toContain('aria-label="Pagination"')
      },
    })
  })

  it('hydrates the full (b) composition fixture without mismatches', async () => {
    const { html } = await expectSsrHydration(FullInvoices, {
      assertServerHtml(html) {
        expect(html).toContain('aria-label="Invoices"')
        expect(html).toContain('data-selected="true"')
        expect(html).toContain('data-expanded="true"')
        expect(html).toContain('data-detail-row="true"')
        expect(html).toContain('aria-expanded="true"')
        // Mixed state is a styling hook in SSR; the `indeterminate` DOM
        // property is applied after mount and never serialized.
        expect(html).toContain('data-state="indeterminate"')
        expect(html).not.toMatch(/\sindeterminate[\s=>]/)
      },
    })
    const controls = /aria-controls="([^"]+)"/.exec(html)?.[1] ?? ''
    expect(controls).not.toBe('')
    expect(html).toContain(`id="${controls}"`)
  })
})
