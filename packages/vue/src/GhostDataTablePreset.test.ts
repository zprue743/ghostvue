import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type VNodeChild } from 'vue'

import GhostDataTable from './GhostDataTable.vue'
import GhostDataTablePreset from './GhostDataTablePreset.vue'
import { defineDataTableColumns } from './define-data-table-columns'
import type {
  DataTableColumnDef,
  DataTableRowId,
  DataTableStateChangePayload,
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

const helper = defineDataTableColumns<Invoice>()
const invoiceColumns = [
  helper.accessorKey('customer', { header: 'Customer' }),
  helper.accessorKey('amount', { header: 'Amount' }),
]

afterEach(() => {
  document.body.innerHTML = ''
})

type SlotFn = (props: Record<string, unknown>) => VNodeChild

interface MountOptions {
  rootProps?: Record<string, unknown>
  presetProps?: Record<string, unknown>
  slots?: Record<string, SlotFn>
  columns?: readonly DataTableColumnDef<Invoice>[]
  data?: readonly Invoice[]
}

function mountPreset(options: MountOptions = {}) {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            GhostDataTable<Invoice>,
            {
              data: options.data ?? invoices,
              columns: options.columns ?? invoiceColumns,
              getRowId: (row: Invoice) => row.id,
              ariaLabel: 'Invoices',
              ...options.rootProps,
            },
            {
              default: () =>
                h(
                  GhostDataTablePreset,
                  options.presetProps ?? {},
                  options.slots,
                ),
            },
          )
      },
    }),
    { attachTo: document.body },
  )
}

type Wrapper = ReturnType<typeof mountPreset>

const withSelectionAndExpansion = {
  enableRowSelection: true,
  enableRowExpansion: true,
}

function headerNames(wrapper: Wrapper): string[] {
  return wrapper
    .findAll('thead th')
    .map((th) => th.attributes('aria-label') ?? th.text())
}

function dataRows(wrapper: Wrapper) {
  return wrapper.findAll('tbody tr:not([data-detail-row])')
}

function customers(wrapper: Wrapper): string[] {
  // The last two cells are the data columns.
  return dataRows(wrapper).map((row) => row.findAll('td').at(-2)?.text() ?? '')
}

function searchInput(wrapper: Wrapper) {
  return wrapper.get('input[type="search"]')
}

describe('GhostDataTablePreset', () => {
  it('renders search, selection, expansion, and data columns with named headers', () => {
    const wrapper = mountPreset({ rootProps: withSelectionAndExpansion })
    const table = wrapper.get('table')

    expect(table.attributes('data-ghost-data-table')).toBe('')
    expect(table.attributes('aria-label')).toBe('Invoices')
    expect(headerNames(wrapper)).toEqual([
      'Selection',
      'Details',
      'Customer',
      'Amount',
    ])
    // No <th> is empty: the expansion header holds visually hidden text.
    for (const th of wrapper.findAll('thead th')) {
      expect(th.attributes('scope')).toBe('col')
      expect(th.text() || th.attributes('aria-label')).toBeTruthy()
    }
    expect(wrapper.get('label').text()).toBe('Search')
    expect(searchInput(wrapper).element.closest('label')).not.toBeNull()
    expect(customers(wrapper)).toEqual(['ACME Corp', 'Globex', 'Initech'])
  })

  it('names every control on the focusable element', () => {
    const wrapper = mountPreset({ rootProps: withSelectionAndExpansion })
    const checkboxes = wrapper.findAll('input[type="checkbox"]')

    expect(checkboxes.map((input) => input.attributes('aria-label'))).toEqual([
      'Select all rows',
      'Select row inv-1',
      'Select row inv-2',
      'Select row inv-3',
    ])
    const expand = wrapper.findAll('tbody button')
    expect(expand.map((button) => button.attributes('aria-label'))).toEqual([
      'Show details for inv-1',
      'Show details for inv-2',
      'Show details for inv-3',
    ])
    for (const button of expand) {
      expect(button.attributes('type')).toBe('button')
      expect(button.attributes('aria-expanded')).toBe('false')
    }
  })

  it('accepts localized header and control labels', () => {
    const wrapper = mountPreset({
      rootProps: withSelectionAndExpansion,
      presetProps: {
        selectionHeaderLabel: 'Auswahl',
        expansionHeaderLabel: 'Einzelheiten',
        searchLabel: 'Rechnungen suchen',
        selectAllLabel: 'Alle auswählen',
        rowSelectionLabel: (rowId: DataTableRowId) =>
          `Rechnung ${String(rowId)}`,
        rowExpansionLabel: (rowId: DataTableRowId) =>
          `Mehr zu ${String(rowId)}`,
      },
    })

    expect(headerNames(wrapper).slice(0, 2)).toEqual([
      'Auswahl',
      'Einzelheiten',
    ])
    expect(wrapper.get('label').text()).toBe('Rechnungen suchen')
    expect(
      wrapper.get('thead input[type="checkbox"]').attributes('aria-label'),
    ).toBe('Alle auswählen')
    expect(
      wrapper.get('tbody input[type="checkbox"]').attributes('aria-label'),
    ).toBe('Rechnung inv-1')
    expect(wrapper.get('tbody button').attributes('aria-label')).toBe(
      'Mehr zu inv-1',
    )
  })

  it('omits selection and expansion columns when the root does not enable them', () => {
    const wrapper = mountPreset()

    expect(headerNames(wrapper)).toEqual(['Customer', 'Amount'])
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
    expect(wrapper.find('tbody button').exists()).toBe(false)
  })

  it('sorts from the header buttons with aria-sort on the <th>', async () => {
    const wrapper = mountPreset({ rootProps: withSelectionAndExpansion })
    const amountHeader = wrapper.findAll('thead th')[3]
    const button = amountHeader?.get('button')

    expect(button?.text()).toBe('Amount')
    await button?.trigger('click')
    expect(amountHeader?.attributes('aria-sort')).toBe('ascending')
    expect(button?.attributes('aria-sort')).toBeUndefined()
    expect(customers(wrapper)).toEqual(['Initech', 'Globex', 'ACME Corp'])
  })

  it('filters through the search field and keeps the head when nothing matches', async () => {
    const onGlobalFilter = vi.fn()
    const wrapper = mountPreset({
      rootProps: {
        ...withSelectionAndExpansion,
        'onUpdate:globalFilter': onGlobalFilter,
      },
      presetProps: { emptyTitle: 'No invoices' },
    })

    await searchInput(wrapper).setValue('glo')
    expect(onGlobalFilter).toHaveBeenLastCalledWith('glo')
    expect(customers(wrapper)).toEqual(['Globex'])

    await searchInput(wrapper).setValue('zzz')
    expect(wrapper.findAll('thead th')).toHaveLength(4)
    const empty = wrapper.get('tbody td')
    expect(empty.attributes('colspan')).toBe('4')
    expect(empty.get('h3').text()).toBe('No invoices')
  })

  it('shows the search field only when a column can be globally filtered', () => {
    const notFilterable = [
      helper.accessorKey('customer', {
        header: 'Customer',
        enableColumnFilter: false,
      }),
    ]
    expect(
      mountPreset({ columns: notFilterable })
        .find('input[type="search"]')
        .exists(),
    ).toBe(false)
    expect(
      mountPreset({
        columns: notFilterable,
        presetProps: { showGlobalFilter: true },
      })
        .find('input[type="search"]')
        .exists(),
    ).toBe(true)
    expect(
      mountPreset({ presetProps: { showGlobalFilter: false } })
        .find('input[type="search"]')
        .exists(),
    ).toBe(false)
  })

  it('commits search through the root so server filtering emits one stateChange on page 1', async () => {
    const stateChanges: DataTableStateChangePayload[] = []
    const wrapper = mountPreset({
      rootProps: {
        manualFiltering: true,
        manualPagination: true,
        rowCount: 100,
        defaultPagination: { pageIndex: 4, pageSize: 10 },
        onStateChange: (payload: DataTableStateChangePayload) => {
          stateChanges.push(payload)
        },
      },
    })

    await searchInput(wrapper).setValue('acme')
    expect(stateChanges).toHaveLength(1)
    expect(stateChanges[0]?.trigger).toBe('globalFilter')
    expect(stateChanges[0]?.query.globalFilter).toBe('acme')
    expect(stateChanges[0]?.query.pagination.pageIndex).toBe(1)
  })

  it('reflects a controlled global filter in the search field', async () => {
    const filter = ref('init')
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
                globalFilter: filter.value,
              },
              { default: () => h(GhostDataTablePreset) },
            )
        },
      }),
    )
    const input = wrapper.get<HTMLInputElement>('input[type="search"]')

    expect(input.element.value).toBe('init')
    filter.value = ''
    await nextTick()
    expect(input.element.value).toBe('')
  })

  it('toggles selection from row and header checkboxes', async () => {
    const onSelected = vi.fn()
    const wrapper = mountPreset({
      rootProps: {
        ...withSelectionAndExpansion,
        'onUpdate:selectedRowIds': onSelected,
      },
    })
    const [all, first] = wrapper.findAll('input[type="checkbox"]')

    await first?.setValue(true)
    expect(onSelected).toHaveBeenLastCalledWith(['inv-1'])
    expect(dataRows(wrapper)[0]?.attributes('data-selected')).toBe('true')
    const header = wrapper.get<HTMLInputElement>('thead input')
    expect(header.element.indeterminate).toBe(true)

    await all?.setValue(true)
    expect(onSelected).toHaveBeenLastCalledWith(['inv-1', 'inv-2', 'inv-3'])
    expect(wrapper.findAll('tbody tr[data-selected]')).toHaveLength(3)
  })

  it('renders the #detail slot in a detail row right after its data row', async () => {
    const wrapper = mountPreset({
      rootProps: withSelectionAndExpansion,
      slots: {
        detail: ({ row, rowId, rowIndex }) =>
          `Detail ${String(rowId)} ${String(rowIndex)} ${(row as Invoice).customer}`,
      },
    })
    const button = wrapper.findAll('tbody button')[1]

    await button?.trigger('click')
    expect(button?.attributes('aria-expanded')).toBe('true')
    const rows = wrapper.findAll('tbody tr')
    expect(rows[1]?.attributes('data-expanded')).toBe('true')
    const detail = rows[2]
    expect(detail?.attributes('data-detail-row')).toBe('true')
    expect(detail?.attributes('data-part')).toBe('row')
    expect(detail?.text()).toBe('Detail inv-2 1 Globex')
    expect(detail?.get('td').attributes('colspan')).toBe('4')
    expect(button?.attributes('aria-controls')).toBe(detail?.attributes('id'))

    await button?.trigger('click')
    expect(wrapper.find('tr[data-detail-row]').exists()).toBe(false)
  })

  it('renders typed #<columnId> cell slots and #toolbar before the table', () => {
    const wrapper = mountPreset({
      slots: {
        amount: ({ value }) => `${(value as number).toFixed(2)} USD`,
        toolbar: () => h('div', { class: 'toolbar' }, 'Tools'),
      },
    })

    expect(
      dataRows(wrapper).map((row) => row.findAll('td')[1]?.text()),
    ).toEqual(['1200.00 USD', '980.50 USD', '42.00 USD'])
    const html = wrapper.html()
    expect(html.indexOf('Tools')).toBeLessThan(html.indexOf('type="search"'))
    expect(html.indexOf('type="search"')).toBeLessThan(html.indexOf('<table'))
  })

  it('replaces the default search control with #search', async () => {
    const onGlobalFilter = vi.fn()
    const wrapper = mountPreset({
      rootProps: { 'onUpdate:globalFilter': onGlobalFilter },
      presetProps: { searchLabel: 'Find' },
      slots: {
        search: ({ label, value, setValue }) =>
          h('button', {
            class: 'custom-search',
            'aria-label': label,
            'data-value': value,
            onClick: () => {
              ;(setValue as (next: string) => void)('globex')
            },
          }),
      },
    })

    expect(wrapper.find('input[type="search"]').exists()).toBe(false)
    const custom = wrapper.get('.custom-search')
    expect(custom.attributes('aria-label')).toBe('Find')
    await custom.trigger('click')
    expect(onGlobalFilter).toHaveBeenCalledWith('globex')
    expect(customers(wrapper)).toEqual(['Globex'])
  })

  it('passes disabled and loading through from the root', async () => {
    const onSelected = vi.fn()
    const onGlobalFilter = vi.fn()
    const wrapper = mountPreset({
      rootProps: {
        ...withSelectionAndExpansion,
        disabled: true,
        loading: true,
        'onUpdate:selectedRowIds': onSelected,
        'onUpdate:globalFilter': onGlobalFilter,
      },
    })

    expect(wrapper.get('table').attributes('aria-busy')).toBe('true')
    expect(searchInput(wrapper).attributes('disabled')).toBeDefined()
    for (const control of wrapper.findAll('table button, table input')) {
      expect(control.attributes('disabled')).toBeDefined()
    }
    await wrapper.get('tbody input').trigger('click')
    expect(onSelected).not.toHaveBeenCalled()
    expect(onGlobalFilter).not.toHaveBeenCalled()
  })

  it('forwards attributes to GhostTable and merges class', () => {
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
                ariaLabel: 'Invoices',
              },
              {
                default: () =>
                  h(GhostDataTablePreset, {
                    class: 'invoices',
                    'aria-label': 'Overridden',
                  }),
              },
            )
        },
      }),
    )
    const table = wrapper.get('table')

    expect(table.classes()).toContain('invoices')
    expect(table.attributes('aria-label')).toBe('Overridden')
    expect(wrapper.findAll('[aria-label="Overridden"]')).toHaveLength(1)
  })

  it('keeps selection and expansion keyed by row id across a reorder', async () => {
    const data = ref<Invoice[]>([...invoices])
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDataTable<Invoice>,
              {
                data: data.value,
                columns: invoiceColumns,
                getRowId: (row: Invoice) => row.id,
                defaultSelectedRowIds: ['inv-2'],
                defaultExpandedRowIds: ['inv-2'],
                ...withSelectionAndExpansion,
              },
              {
                default: () =>
                  h(GhostDataTablePreset, null, {
                    detail: ({ rowId }: { rowId: DataTableRowId }) =>
                      `Detail ${String(rowId)}`,
                  }),
              },
            )
        },
      }),
    )

    data.value = [invoices[2], invoices[1], invoices[0]].filter(
      (row): row is Invoice => row !== undefined,
    )
    await nextTick()
    const rows = wrapper.findAll('tbody tr')
    expect(rows.map((row) => row.attributes('data-detail-row') ?? '')).toEqual([
      '',
      '',
      'true',
      '',
    ])
    expect(rows[1]?.attributes('data-selected')).toBe('true')
    expect(rows[2]?.text()).toBe('Detail inv-2')
  })

  it('throws outside GhostDataTable', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(() => mount(GhostDataTablePreset)).toThrow(
      'GhostDataTablePreset must be used inside GhostDataTable',
    )
  })
})
