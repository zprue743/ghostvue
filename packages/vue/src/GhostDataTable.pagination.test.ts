import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, shallowRef, type Ref } from 'vue'

import GhostDataTable from './GhostDataTable.vue'
import GhostPagination from './GhostPagination.vue'
import type {
  DataTableColumnDef,
  DataTablePaginationState,
  DataTableStateChangePayload,
  GhostDataTableSlotProps,
} from './ghost-data-table'

/*
 * GHO-238: GhostDataTable wired to a co-located GhostPagination through the
 * root's pager slot bindings (`pagination`, `pageCount`, `setPageIndex`), the
 * composition documented in the spec's Pagination section.
 */

interface Invoice {
  id: string
  customer: string
}

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
]

function invoices(count: number, offset = 0): Invoice[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `inv-${String(index + 1 + offset)}`,
    customer: `Customer ${String(index + 1 + offset)}`,
  }))
}

afterEach(() => {
  document.body.innerHTML = ''
})

interface MountOptions {
  data: Ref<readonly Invoice[]>
  pagination: DataTablePaginationState
  manualPagination?: boolean
  rowCount?: Ref<number>
  pageCount?: Ref<number | undefined>
  globalFilter?: Ref<string>
}

/** Parent owns `v-model:pagination`, as an app would. */
function mountWithPager(options: MountOptions) {
  const pagination = ref(options.pagination)
  const onStateChange = vi.fn<(payload: DataTableStateChangePayload) => void>()
  const onPaginationChange = vi.fn<(next: DataTablePaginationState) => void>()
  let captured: GhostDataTableSlotProps<Invoice> | undefined
  // A plain record, spread like `mountCapture` in GhostDataTable.test.ts:
  // the generic SFC's h() overloads reject these optional props inline.
  const pagerProps = (): Record<string, unknown> => ({
    manualPagination: options.manualPagination ?? false,
    rowCount: options.rowCount?.value,
    pageCount: options.pageCount?.value,
    globalFilter: options.globalFilter?.value,
    pagination: pagination.value,
    'onUpdate:pagination': (next: DataTablePaginationState) => {
      onPaginationChange(next)
      pagination.value = next
    },
    onStateChange,
  })
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            GhostDataTable<Invoice>,
            {
              ...pagerProps(),
              data: options.data.value,
              columns,
              getRowId: (row: Invoice) => row.id,
            },
            {
              default: (slot: GhostDataTableSlotProps<Invoice>) => {
                captured = slot
                return [
                  h(
                    'ul',
                    { class: 'rows' },
                    slot.rows.map((row) =>
                      h('li', { key: row.rowId }, row.row.customer),
                    ),
                  ),
                  h(GhostPagination, {
                    modelValue: slot.pagination.pageIndex,
                    pageCount: slot.pageCount,
                    'onUpdate:modelValue': slot.setPageIndex,
                  }),
                ]
              },
            },
          )
      },
    }),
    { attachTo: document.body },
  )
  return {
    wrapper,
    pagination,
    onStateChange,
    onPaginationChange,
    slot: (): GhostDataTableSlotProps<Invoice> => {
      if (!captured) throw new Error('slot not rendered')
      return captured
    },
    currentPage: () => wrapper.get('button[aria-current="page"]').text(),
    pageButton: (page: number) =>
      wrapper.get(`button[aria-label="Page ${String(page)}"]`),
    hasPageButton: (page: number) =>
      wrapper.find(`button[aria-label="Page ${String(page)}"]`).exists(),
  }
}

describe('GhostDataTable + GhostPagination (local pagination)', () => {
  it('derives pageCount from the filtered rows and pages through the slice', async () => {
    const globalFilter = ref('')
    const table = mountWithPager({
      data: shallowRef(invoices(23)),
      pagination: { pageIndex: 1, pageSize: 5 },
      globalFilter,
    })
    expect(table.slot().pageCount).toBe(5)
    expect(table.slot().rowCount).toBe(23)
    expect(table.hasPageButton(5)).toBe(true)

    await table.pageButton(5).trigger('click')
    await nextTick()
    expect(table.pagination.value).toEqual({ pageIndex: 5, pageSize: 5 })
    expect(table.currentPage()).toBe('5')
    expect(
      table.wrapper.findAll('ul.rows > li').map((li) => li.text()),
    ).toEqual(['Customer 21', 'Customer 22', 'Customer 23'])
    // Local pagination never asks the consumer to fetch.
    expect(table.onStateChange).not.toHaveBeenCalled()

    // "Customer 1" matches 1 and 10–19 (11 rows): 3 pages, so page 5 clamps.
    globalFilter.value = 'customer 1'
    await nextTick()
    await nextTick()
    expect(table.slot().pageCount).toBe(3)
    expect(table.pagination.value.pageIndex).toBe(3)
    expect(table.currentPage()).toBe('3')
    expect(table.hasPageButton(4)).toBe(false)
  })

  it('clamps rather than resets to page 1 when the data reference changes', async () => {
    const data = shallowRef<readonly Invoice[]>(invoices(50))
    const table = mountWithPager({
      data,
      pagination: { pageIndex: 4, pageSize: 10 },
    })
    expect(table.currentPage()).toBe('4')

    // A refresh that still covers page 4 keeps it: no write at all.
    data.value = invoices(45, 100)
    await nextTick()
    await nextTick()
    expect(table.onPaginationChange).not.toHaveBeenCalled()
    expect(table.currentPage()).toBe('4')

    // A shorter refresh clamps to the new last page, not to page 1.
    data.value = invoices(25, 200)
    await nextTick()
    await nextTick()
    expect(table.onPaginationChange).toHaveBeenCalledTimes(1)
    expect(table.onPaginationChange).toHaveBeenCalledWith({
      pageIndex: 3,
      pageSize: 10,
    })
    expect(table.currentPage()).toBe('3')
    expect(table.onStateChange).not.toHaveBeenCalled()
  })

  it('shows page 1 of 1 for an empty local data set', async () => {
    const data = shallowRef<readonly Invoice[]>(invoices(30))
    const table = mountWithPager({
      data,
      pagination: { pageIndex: 3, pageSize: 10 },
    })
    data.value = []
    await nextTick()
    await nextTick()
    expect(table.slot().rowCount).toBe(0)
    expect(table.slot().pageCount).toBe(1)
    expect(table.pagination.value.pageIndex).toBe(1)
    expect(table.currentPage()).toBe('1')
    expect(table.hasPageButton(2)).toBe(false)
  })
})

describe('GhostDataTable + GhostPagination (server pagination)', () => {
  it('uses rowCount for pageCount and emits one stateChange per page click', async () => {
    const rowCount = ref(95)
    const table = mountWithPager({
      data: shallowRef(invoices(10)),
      pagination: { pageIndex: 1, pageSize: 10 },
      manualPagination: true,
      rowCount,
    })
    // pageCount comes from rowCount, never from the loaded page length.
    expect(table.slot().pageCount).toBe(10)
    expect(table.hasPageButton(10)).toBe(true)

    await table.pageButton(10).trigger('click')
    await nextTick()
    expect(table.onStateChange).toHaveBeenCalledTimes(1)
    expect(table.onStateChange.mock.calls[0]?.[0]).toMatchObject({
      trigger: 'pagination',
      query: { pagination: { pageIndex: 10, pageSize: 10 } },
    })
    expect(table.currentPage()).toBe('10')
  })

  it('emits exactly one stateChange with the clamped page when rowCount shrinks', async () => {
    const rowCount = ref(100)
    const table = mountWithPager({
      data: shallowRef(invoices(10)),
      pagination: { pageIndex: 9, pageSize: 10 },
      manualPagination: true,
      rowCount,
    })
    rowCount.value = 42
    await nextTick()
    await nextTick()
    expect(table.onStateChange).toHaveBeenCalledTimes(1)
    expect(table.onStateChange.mock.calls[0]?.[0]).toMatchObject({
      trigger: 'pagination',
      query: { pagination: { pageIndex: 5, pageSize: 10 } },
    })
    expect(table.onPaginationChange).toHaveBeenCalledTimes(1)
    expect(table.pagination.value).toEqual({ pageIndex: 5, pageSize: 10 })
    expect(table.currentPage()).toBe('5')

    // The parent's v-model echo and the follow-up response do not refetch.
    rowCount.value = 45
    await nextTick()
    await nextTick()
    expect(table.onStateChange).toHaveBeenCalledTimes(1)
  })

  it('emits exactly one stateChange when a pageCount override forces the page down', async () => {
    const pageCount = ref<number | undefined>(12)
    const table = mountWithPager({
      data: shallowRef(invoices(10)),
      pagination: { pageIndex: 12, pageSize: 10 },
      manualPagination: true,
      rowCount: ref(500),
      pageCount,
    })
    expect(table.currentPage()).toBe('12')
    pageCount.value = 4
    await nextTick()
    await nextTick()
    expect(table.onStateChange).toHaveBeenCalledTimes(1)
    expect(table.onStateChange.mock.calls[0]?.[0].query.pagination).toEqual({
      pageIndex: 4,
      pageSize: 10,
    })
    expect(table.currentPage()).toBe('4')
  })

  it('rowCount 0: page 1 of 1, one stateChange for the clamped page', async () => {
    const rowCount = ref(80)
    const data = shallowRef<readonly Invoice[]>(invoices(10))
    const table = mountWithPager({
      data,
      pagination: { pageIndex: 6, pageSize: 10 },
      manualPagination: true,
      rowCount,
    })
    // The server answers the current query with no rows at all.
    data.value = []
    rowCount.value = 0
    await nextTick()
    await nextTick()
    expect(table.slot().pageCount).toBe(1)
    expect(table.slot().pagination).toEqual({ pageIndex: 1, pageSize: 10 })
    expect(table.onStateChange).toHaveBeenCalledTimes(1)
    expect(
      table.onStateChange.mock.calls[0]?.[0].query.pagination.pageIndex,
    ).toBe(1)
    expect(table.currentPage()).toBe('1')
    expect(table.hasPageButton(2)).toBe(false)
  })

  it('rowCount 0 on first render shows page 1 of 1 without a stateChange', async () => {
    const table = mountWithPager({
      data: shallowRef([]),
      pagination: { pageIndex: 3, pageSize: 10 },
      manualPagination: true,
      rowCount: ref(0),
    })
    await nextTick()
    expect(table.slot().pageCount).toBe(1)
    expect(table.slot().pagination.pageIndex).toBe(1)
    expect(table.currentPage()).toBe('1')
    // Hydrating an out-of-range page is a restore, not a user action.
    expect(table.onStateChange).not.toHaveBeenCalled()
    expect(table.onPaginationChange).not.toHaveBeenCalled()
  })

  it('keeps the page when rowCount > 0 but the loaded page is empty', async () => {
    const data = shallowRef<readonly Invoice[]>(invoices(10))
    const table = mountWithPager({
      data,
      pagination: { pageIndex: 4, pageSize: 10 },
      manualPagination: true,
      rowCount: ref(80),
    })
    data.value = []
    await nextTick()
    await nextTick()
    expect(table.slot().rows).toEqual([])
    expect(table.currentPage()).toBe('4')
    expect(table.onStateChange).not.toHaveBeenCalled()
  })
})
