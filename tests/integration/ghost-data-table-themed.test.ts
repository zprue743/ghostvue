import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, shallowRef, type VNodeChild } from 'vue'

import ThemedInvoices from '../../examples/data-table/themed-invoices.vue'
import {
  GhostDataTable,
  GhostDataTablePreset,
  GhostDataTableTable,
  defineDataTableColumns,
  type GhostDataTableThemedExposed,
} from '../../packages/themes/src/components'
import {
  GhostDataTable as HeadlessRoot,
  GhostDataTablePreset as HeadlessPreset,
  type GhostDataTablePresetBulkActionsSlotProps,
  type GhostDataTablePresetFooterSlotProps,
  type DataTableStateChangePayload,
} from '../../packages/vue/src/index'
import { expectSsrHydration } from '../support/ssr-hydration'

interface Invoice {
  id: string
  total: number
}

const data = [
  { id: 'first', total: 10 },
  { id: 'second', total: 20 },
]
const helper = defineDataTableColumns<Invoice>()
const idColumn = helper.accessorKey('id', { header: 'Invoice' })
const totalColumn = helper.accessorKey('total', { header: 'Total' })

describe('DataTable preset slot ownership', () => {
  for (const [layer, Preset] of [
    ['headless', HeadlessPreset],
    ['themed', GhostDataTablePreset],
  ] as const) {
    it.each(['toolbarStart', 'toolbarEnd', 'bulkActions', 'footer'] as const)(
      `keeps a legacy %s cell slot through column insertion and reorder in the ${layer} preset`,
      async (name) => {
        const customColumn = helper.accessorKey('total', {
          id: name,
          header: 'Custom',
        })
        const columns = shallowRef<
          readonly (typeof idColumn | typeof customColumn)[]
        >([])
        const cell = vi.fn((props: Record<string, unknown>): VNodeChild =>
          h('span', { class: 'custom-cell' }, String(props['value'])),
        )
        const wrapper = mount(
          defineComponent({
            setup: () => () =>
              h(
                HeadlessRoot<Invoice>,
                {
                  data,
                  columns: columns.value,
                  getRowId: (row: Invoice) => row.id,
                },
                {
                  default: () =>
                    h(Preset, { showGlobalFilter: false }, { [name]: cell }),
                },
              ),
          }),
        )
        expect(cell).not.toHaveBeenCalled()
        columns.value = [idColumn, customColumn]
        await nextTick()
        expect(
          wrapper.findAll('.custom-cell').map((item) => item.text()),
        ).toEqual(['10', '20'])
        columns.value = [customColumn, idColumn]
        await nextTick()
        expect(wrapper.get('tbody td:first-child').text()).toBe('10')
        columns.value = [idColumn]
        await nextTick()
        expect(wrapper.findAll('.custom-cell')).toHaveLength(0)
        expect(
          wrapper
            .find(
              '[data-part="footer"],[data-part="bulk-actions"],[data-part="header"]',
            )
            .exists(),
        ).toBe(false)
        wrapper.unmount()
      },
    )
  }

  it('routes an opted-in footer once and leaves a colliding column to its cell renderer', () => {
    const footerColumn = helper.accessorKey('total', {
      id: 'footer',
      header: 'Total',
      cell: ({ value }) => `cell ${String(value)}`,
    })
    const footer = vi.fn(({ rowCount }: Record<string, unknown>) =>
      h('span', String(rowCount)),
    )
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            HeadlessRoot<Invoice>,
            {
              data,
              columns: [footerColumn],
              getRowId: (row: Invoice) => row.id,
            },
            {
              default: () =>
                h(
                  GhostDataTablePreset,
                  { layoutSlots: ['footer'] },
                  { footer },
                ),
            },
          ),
      }),
    )
    expect(footer).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-part="footer"]').text()).toBe('2')
    expect(wrapper.findAll('tbody td').map((cell) => cell.text())).toEqual([
      'cell 10',
      'cell 20',
    ])
    wrapper.unmount()
  })
})

describe('themed DataTable wrappers', () => {
  it('preserves off-page selection and forwards one manual footer update', async () => {
    const disabled = shallowRef(false)
    const selectionEnabled = shallowRef(true)
    const updateSelection = vi.fn()
    const updatePage = vi.fn()
    const stateChange = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            HeadlessRoot<Invoice>,
            {
              data,
              columns: [totalColumn],
              getRowId: (row: Invoice) => row.id,
              enableRowSelection: selectionEnabled.value,
              disabled: disabled.value,
              defaultSelectedRowIds: ['first', 'off-page'],
              defaultPagination: { pageIndex: 1, pageSize: 2 },
              manualPagination: true,
              rowCount: 8,
              'onUpdate:selectedRowIds': updateSelection,
              'onUpdate:pagination': updatePage,
              onStateChange: stateChange,
            },
            {
              default: () =>
                h(
                  GhostDataTablePreset,
                  {
                    layoutSlots: ['bulkActions', 'footer'],
                  },
                  {
                    bulkActions: ({
                      selectedRowIds,
                      selectedCount,
                      clearSelection,
                    }: GhostDataTablePresetBulkActionsSlotProps) =>
                      h('button', { type: 'button', onClick: clearSelection }, [
                        String(selectedCount),
                        ': ',
                        selectedRowIds.join(', '),
                      ]),
                    footer: ({
                      rowCount,
                      pageCount,
                      pagination,
                      setPageIndex,
                    }: GhostDataTablePresetFooterSlotProps) =>
                      h(
                        'button',
                        {
                          type: 'button',
                          onClick: () => {
                            setPageIndex(pagination.pageIndex + 1)
                          },
                        },
                        [
                          String(rowCount),
                          ' invoices, ',
                          String(pageCount),
                          ' pages',
                        ],
                      ),
                  },
                ),
            },
          ),
      }),
    )
    const actions = wrapper.get('[data-part="bulk-actions"] button')
    expect(actions.text()).toBe('2: first, off-page')
    disabled.value = true
    await nextTick()
    await actions.trigger('click')
    expect(updateSelection).not.toHaveBeenCalled()
    disabled.value = false
    await nextTick()
    const footer = wrapper.get('[data-part="footer"] button')
    expect(footer.text()).toBe('8 invoices, 4 pages')
    await footer.trigger('click')
    expect(updatePage).toHaveBeenCalledWith({ pageIndex: 2, pageSize: 2 })
    expect(stateChange).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-part="bulk-actions"]').text()).toContain(
      'off-page',
    )
    selectionEnabled.value = false
    await nextTick()
    expect(wrapper.find('[data-part="bulk-actions"]').exists()).toBe(false)
    selectionEnabled.value = true
    await nextTick()
    await wrapper.get('[data-part="bulk-actions"] button').trigger('click')
    expect(updateSelection).toHaveBeenCalledWith([])
    expect(wrapper.find('[data-part="bulk-actions"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('merges attrs, forwards the table name and state, and delegates commands and model changes', async () => {
    const table = shallowRef<GhostDataTableThemedExposed<Invoice> | null>(null)
    const onSorting = vi.fn()
    const onStateChange = vi.fn<(event: DataTableStateChangePayload) => void>()
    const onPagination = vi.fn()
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostDataTable<Invoice>,
            {
              data,
              columns: [idColumn, totalColumn],
              getRowId: (row: Invoice) => row.id,
              ariaLabelledby: 'invoices-heading',
              class: 'consumer',
              style: { '--invoice-density': '1' },
              'data-part': 'consumer',
              'data-themed': 'consumer',
              ref: table,
              enableRowSelection: true,
              enableRowExpansion: true,
              manualSorting: true,
              manualPagination: true,
              rowCount: 4,
              defaultPagination: { pageIndex: 1, pageSize: 2 },
              'onUpdate:sorting': onSorting,
              'onUpdate:pagination': onPagination,
              onStateChange,
            },
            {
              default: () =>
                h(GhostDataTablePreset, {
                  class: 'consumer-table',
                  style: { '--invoice-table': '1' },
                }),
            },
          ),
      }),
    )
    const shell = wrapper.get('.ghost-data-table')
    expect(shell.classes()).toEqual(
      expect.arrayContaining(['consumer', 'ghost-themed-scope']),
    )
    expect(shell.attributes('style')).toContain('--invoice-density: 1')
    expect(shell.attributes('data-part')).toBe('root')
    expect(shell.attributes('data-themed')).toBe('')
    expect(shell.attributes('data-size')).toBeUndefined()
    expect(shell.attributes('data-variant')).toBeUndefined()
    expect(shell.attributes('data-sticky-header')).toBeUndefined()
    expect(shell.attributes('data-state')).toBeUndefined()
    expect(shell.attributes('aria-labelledby')).toBeUndefined()
    const native = wrapper.get('table')
    expect(native.attributes('aria-labelledby')).toBe('invoices-heading')
    expect(native.classes()).toContain('consumer-table')
    expect(native.attributes('style')).toContain('--invoice-table: 1')
    const exposed = table.value
    if (!exposed) throw new Error('Expected themed DataTable ref')
    expect(exposed.element).toBe(shell.element)
    exposed.toggleSorting('total')
    await nextTick()
    expect(onSorting).toHaveBeenCalledWith([{ id: 'total', desc: false }])
    expect(onStateChange).toHaveBeenCalledTimes(1)
    exposed.setPageIndex(2)
    await nextTick()
    expect(onPagination).toHaveBeenCalledWith({ pageIndex: 2, pageSize: 2 })
    expect(onStateChange).toHaveBeenCalledTimes(2)
    exposed.toggleRowSelected('second', true)
    await nextTick()
    expect(exposed.getSelectedRowModel()).toHaveLength(1)
    exposed.resetRowSelection()
    exposed.toggleRowExpanded('second')
    await nextTick()
    expect(exposed.getSelectedRowModel()).toHaveLength(0)
    expect(wrapper.find('[data-detail-row]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('preserves selection action, layout and name markup across hydration', async () => {
    const { html } = await expectSsrHydration(ThemedInvoices)
    expect(html).toContain('aria-label="Invoices"')
    expect(html).toContain('aria-label="Invoice table"')
    expect(html).toContain('data-size="sm"')
    expect(html).toContain('data-variant="card"')
    expect(html).toContain('data-sticky-header')
    expect(html).toContain('data-part="bulk-actions"')
    expect(html).toContain('data-part="footer"')
  })

  it('marks only the themed mapper scope and forwards consumer table attributes', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            HeadlessRoot<Invoice>,
            {
              data,
              columns: [totalColumn],
              getRowId: (row: Invoice) => row.id,
            },
            {
              default: () =>
                h(GhostDataTableTable, {
                  class: 'mapper-consumer',
                  style: { '--mapper-test': '1' },
                  containHorizontal: true,
                  scrollLabel: 'Invoice totals',
                }),
            },
          ),
      }),
    )
    expect(
      wrapper.get('.ghost-data-table-table[data-themed]').classes(),
    ).toContain('ghost-themed-scope')
    expect(wrapper.get('[role="region"]').attributes('aria-label')).toBe(
      'Invoice totals',
    )
    expect(wrapper.get('table').classes()).toContain('mapper-consumer')
    expect(wrapper.get('table').attributes('style')).toContain(
      '--mapper-test: 1',
    )
    const button = wrapper.get('th button')
    expect(button.text()).toBe('Total')
    expect(button.attributes('data-part')).toBe('sort-button')
    expect(button.find('svg').exists()).toBe(false)
    wrapper.unmount()
  })
})
