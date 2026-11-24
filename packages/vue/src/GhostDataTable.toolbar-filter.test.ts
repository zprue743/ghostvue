import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, onBeforeUnmount, ref } from 'vue'

import GhostButton from './GhostButton.vue'
import GhostDataTable from './GhostDataTable.vue'
import GhostInput from './GhostInput.vue'
import GhostToolbar from './GhostToolbar.vue'
import type {
  DataTableColumnDef,
  DataTableColumnFilter,
  DataTableStateChangePayload,
  GhostDataTableExposed,
  GhostDataTableSlotProps,
} from './ghost-data-table'

/*
 * Mirrors the "Toolbar composition and consumer-owned debouncing" snippet in
 * docs/components/data-table-spec.md (GHO-237): a labelled GhostInput beside a
 * GhostToolbar of filter buttons, with the debounce owned by the consumer.
 * Commits go through the exposed actions (not a direct v-model write), which
 * is what applies the filter page-reset rule and emits `stateChange`.
 * Keep the two in sync until docs/components/data-table.md (GHO-247) hosts a
 * runnable example.
 */

interface Invoice {
  id: string
  customer: string
  status: 'paid' | 'open'
}

const invoices: Invoice[] = [
  { id: 'inv-1', customer: 'ACME Corp', status: 'paid' },
  { id: 'inv-2', customer: 'Globex', status: 'open' },
  { id: 'inv-3', customer: 'Acme Labs', status: 'open' },
  { id: 'inv-4', customer: 'Initech', status: 'paid' },
]

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'status', header: 'Status', accessorKey: 'status' },
]

const DEBOUNCE_MS = 250

function mountInvoiceFilters(tableProps: Record<string, unknown> = {}) {
  const stateChanges: DataTableStateChangePayload[] = []
  const Host = defineComponent({
    setup() {
      const search = ref('')
      const globalFilter = ref('')
      const columnFilters = ref<DataTableColumnFilter[]>([])
      const table = ref<GhostDataTableExposed<Invoice>>()

      let timer: ReturnType<typeof setTimeout> | undefined
      function onSearch(value: string): void {
        search.value = value
        clearTimeout(timer)
        timer = setTimeout(
          () => table.value?.setGlobalFilter(value),
          DEBOUNCE_MS,
        )
      }
      onBeforeUnmount(() => {
        clearTimeout(timer)
      })

      const paidOnly = computed(() =>
        columnFilters.value.some(
          (filter) => filter.id === 'status' && filter.value === 'paid',
        ),
      )
      function togglePaid(): void {
        table.value?.setColumnFilter('status', paidOnly.value ? '' : 'paid')
      }
      function clearFilters(): void {
        clearTimeout(timer)
        search.value = ''
        table.value?.setGlobalFilter('')
        table.value?.setColumnFilters([])
      }

      return () => [
        h('div', { class: 'invoice-filters' }, [
          h('label', [
            'Search invoices',
            h(GhostInput, {
              modelValue: search.value,
              type: 'search',
              'onUpdate:modelValue': onSearch,
            }),
          ]),
          h(
            GhostToolbar,
            { label: 'Invoice filters' },
            {
              default: () => [
                h(
                  GhostButton,
                  {
                    class: 'paid-only',
                    'aria-pressed': paidOnly.value,
                    onClick: togglePaid,
                  },
                  { default: () => 'Paid only' },
                ),
                h(
                  GhostButton,
                  { class: 'clear', onClick: clearFilters },
                  { default: () => 'Clear filters' },
                ),
              ],
            },
          ),
        ]),
        h(
          GhostDataTable<Invoice>,
          {
            ref: table,
            data: invoices,
            columns,
            getRowId: (row: Invoice) => row.id,
            ariaLabel: 'Invoices',
            globalFilter: globalFilter.value,
            'onUpdate:globalFilter': (next: unknown) => {
              globalFilter.value = typeof next === 'string' ? next : ''
            },
            columnFilters: columnFilters.value,
            'onUpdate:columnFilters': (next: DataTableColumnFilter[]) => {
              columnFilters.value = next
            },
            onStateChange: (payload: DataTableStateChangePayload) => {
              stateChanges.push(payload)
            },
            ...tableProps,
          },
          {
            default: ({ rows }: GhostDataTableSlotProps<Invoice>) =>
              h(
                'ul',
                { class: 'rows' },
                rows.map((entry) =>
                  h('li', { key: entry.rowId }, String(entry.rowId)),
                ),
              ),
          },
        ),
      ]
    },
  })
  const wrapper = mount(Host, { attachTo: document.body })
  const visibleIds = (): string[] =>
    wrapper.findAll('.rows li').map((item) => item.text())
  return { wrapper, stateChanges, visibleIds }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

describe('GhostDataTable toolbar filter composition', () => {
  it('names the search field and keeps it outside the toolbar', () => {
    const { wrapper } = mountInvoiceFilters()
    const input = wrapper.get('input[type="search"]')
    expect(input.element.closest('label')?.textContent).toContain(
      'Search invoices',
    )
    expect(input.element.closest('[role="toolbar"]')).toBeNull()
    const toolbar = wrapper.get('[role="toolbar"]')
    expect(toolbar.attributes('aria-label')).toBe('Invoice filters')
    expect(toolbar.findAll('button')).toHaveLength(2)
    wrapper.unmount()
  })

  it('applies the search to the table only after the consumer debounce', async () => {
    const { wrapper, visibleIds } = mountInvoiceFilters()
    const input = wrapper.get('input[type="search"]')

    await input.setValue('a')
    await input.setValue('ac')
    await input.setValue('acme')
    expect(visibleIds()).toEqual(['inv-1', 'inv-2', 'inv-3', 'inv-4'])

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(visibleIds()).toEqual(['inv-1', 'inv-3'])

    await wrapper.get('.paid-only').trigger('click')
    expect(wrapper.get('.paid-only').attributes('aria-pressed')).toBe('true')
    expect(visibleIds()).toEqual(['inv-1'])
    wrapper.unmount()
  })

  it('clears immediately and drops a pending keystroke', async () => {
    const { wrapper, visibleIds } = mountInvoiceFilters()
    const input = wrapper.get('input[type="search"]')

    await input.setValue('globex')
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(visibleIds()).toEqual(['inv-2'])

    await input.setValue('initech')
    await wrapper.get('.clear').trigger('click')
    expect(visibleIds()).toEqual(['inv-1', 'inv-2', 'inv-3', 'inv-4'])
    expect((input.element as HTMLInputElement).value).toBe('')

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(visibleIds()).toEqual(['inv-1', 'inv-2', 'inv-3', 'inv-4'])
    wrapper.unmount()
  })

  it('server filtering emits one page-1 stateChange per debounced commit', async () => {
    const { wrapper, stateChanges } = mountInvoiceFilters({
      manualFiltering: true,
      manualPagination: true,
      rowCount: 200,
      defaultPagination: { pageIndex: 4, pageSize: 10 },
    })
    const input = wrapper.get('input[type="search"]')

    for (const value of ['a', 'ac', 'acm', 'acme']) {
      await input.setValue(value)
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS / 5)
    }
    expect(stateChanges).toHaveLength(0)

    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS)
    expect(stateChanges).toHaveLength(1)
    expect(stateChanges[0]).toMatchObject({
      trigger: 'globalFilter',
      query: {
        globalFilter: 'acme',
        pagination: { pageIndex: 1, pageSize: 10 },
      },
    })

    await wrapper.get('.paid-only').trigger('click')
    expect(stateChanges).toHaveLength(2)
    expect(stateChanges[1]).toMatchObject({
      trigger: 'columnFilters',
      query: {
        columnFilters: [{ id: 'status', value: 'paid' }],
        pagination: { pageIndex: 1 },
      },
    })
    wrapper.unmount()
  })
})
