import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref, type VNodeChild } from 'vue'

import GhostDataTable from './GhostDataTable.vue'
import GhostDataTableTable from './GhostDataTableTable.vue'
import { defineDataTableColumns } from './define-data-table-columns'
import type {
  DataTableColumnDef,
  DataTableColumnSort,
  DataTablePaginationState,
} from './ghost-data-table'

interface Invoice {
  id: string
  customer: string
  amount: number
  note?: string | null
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

/** Runtime shape of a `#<columnId>` slot's props (types live in type-tests). */
interface CellSlotProps {
  row: unknown
  rowId: unknown
  rowIndex: number
  column: unknown
  value: unknown
  getValue: () => unknown
}

interface MountOptions {
  rootProps?: Record<string, unknown>
  tableProps?: Record<string, unknown>
  slots?: Record<string, (props: CellSlotProps) => VNodeChild>
  columns?: readonly DataTableColumnDef<Invoice>[]
}

function mountTable(options: MountOptions = {}) {
  return mount(
    defineComponent({
      setup() {
        return () =>
          h(
            GhostDataTable<Invoice>,
            {
              data: invoices,
              columns: options.columns ?? invoiceColumns,
              getRowId: (row: Invoice) => row.id,
              ariaLabel: 'Invoices',
              ...options.rootProps,
            },
            {
              default: () =>
                h(GhostDataTableTable, options.tableProps ?? {}, options.slots),
            },
          )
      },
    }),
    { attachTo: document.body },
  )
}

type Wrapper = ReturnType<typeof mountTable>

function headerTexts(wrapper: Wrapper): string[] {
  return wrapper.findAll('thead th').map((th) => th.text())
}

function bodyRows(wrapper: Wrapper): string[][] {
  return wrapper
    .findAll('tbody tr')
    .map((row) => row.findAll('td').map((td) => td.text()))
}

describe('GhostDataTableTable', () => {
  it('renders a native table from the parent columns and rows', () => {
    const wrapper = mountTable()
    const table = wrapper.get('table')

    expect(table.attributes('data-ghost-data-table')).toBe('')
    expect(table.attributes('aria-label')).toBe('Invoices')
    expect(table.attributes('data-part')).toBe('root')
    expect(wrapper.find('[role="grid"]').exists()).toBe(false)
    expect(headerTexts(wrapper)).toEqual(['Customer', 'Amount'])
    expect(
      wrapper.findAll('thead th').map((th) => th.attributes('scope')),
    ).toEqual(['col', 'col'])
    expect(bodyRows(wrapper)).toEqual([
      ['ACME Corp', '1200'],
      ['Globex', '980.5'],
      ['Initech', '42'],
    ])
  })

  it('never renders an empty header cell', () => {
    const wrapper = mountTable({
      columns: [
        { id: 'customer', accessorKey: 'customer' },
        { id: 'amount', header: '', accessorKey: 'amount' },
      ],
    })

    expect(headerTexts(wrapper)).toEqual(['customer', 'amount'])
  })

  it('cycles sorting from the header button and sets aria-sort on the <th>', async () => {
    const wrapper = mountTable()
    const amountHeader = wrapper.findAll('thead th')[1]
    const button = amountHeader?.get('button')

    expect(button?.attributes('type')).toBe('button')
    expect(button?.attributes('aria-sort')).toBeUndefined()
    expect(amountHeader?.attributes('aria-sort')).toBeUndefined()

    await button?.trigger('click')
    expect(amountHeader?.attributes('aria-sort')).toBe('ascending')
    expect(amountHeader?.attributes('data-sort')).toBe('asc')
    expect(bodyRows(wrapper).map((row) => row[0])).toEqual([
      'Initech',
      'Globex',
      'ACME Corp',
    ])

    await button?.trigger('click')
    expect(amountHeader?.attributes('aria-sort')).toBe('descending')
    expect(bodyRows(wrapper).map((row) => row[0])).toEqual([
      'ACME Corp',
      'Globex',
      'Initech',
    ])

    await button?.trigger('click')
    expect(amountHeader?.attributes('aria-sort')).toBeUndefined()
    expect(wrapper.findAll('th[aria-sort]')).toHaveLength(0)
  })

  it('renders plain header text for columns that cannot sort', () => {
    const wrapper = mountTable({
      columns: [
        helper.accessorKey('customer', {
          header: 'Customer',
          enableSorting: false,
        }),
        helper.accessorKey('amount', { header: 'Amount' }),
      ],
    })
    const [customer, amount] = wrapper.findAll('thead th')

    expect(customer?.find('button').exists()).toBe(false)
    expect(customer?.text()).toBe('Customer')
    expect(amount?.find('button').exists()).toBe(true)
  })

  it('disables sort buttons while the table is disabled', async () => {
    const onSorting = vi.fn()
    const wrapper = mountTable({
      rootProps: { disabled: true, 'onUpdate:sorting': onSorting },
    })
    const button = wrapper.get('thead button')

    expect(button.attributes('disabled')).toBeDefined()
    await button.trigger('click')
    expect(onSorting).not.toHaveBeenCalled()
  })

  it('emits sorting updates for a controlled v-model', async () => {
    const sorting = ref<DataTableColumnSort[]>([])
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
                sorting: sorting.value,
                'onUpdate:sorting': (next: DataTableColumnSort[]) => {
                  sorting.value = next
                },
              },
              { default: () => h(GhostDataTableTable) },
            )
        },
      }),
    )

    await wrapper.get('thead button').trigger('click')
    expect(sorting.value).toEqual([{ id: 'customer', desc: false }])
  })

  it('passes typed cell context to a #<columnId> slot', () => {
    const received: CellSlotProps[] = []
    const wrapper = mountTable({
      slots: {
        amount: (props) => {
          received.push(props)
          const value = props.value
          return typeof value === 'number' ? `${value.toFixed(2)} USD` : ''
        },
      },
    })

    expect(bodyRows(wrapper).map((row) => row[1])).toEqual([
      '1200.00 USD',
      '980.50 USD',
      '42.00 USD',
    ])
    const first = received[0]
    expect(first).toMatchObject({
      row: invoices[0],
      rowId: 'inv-1',
      rowIndex: 0,
      column: invoiceColumns[1],
      value: 1200,
    })
    expect(first?.getValue()).toBe(1200)
  })

  it('prefers a slot over the column cell hook, and the hook over the value', () => {
    const columns: DataTableColumnDef<Invoice>[] = [
      {
        id: 'customer',
        header: 'Customer',
        accessorKey: 'customer',
        cell: ({ row }) => h('strong', { class: 'hook' }, row.customer),
      },
      {
        id: 'amount',
        header: 'Amount',
        accessorKey: 'amount',
        cell: () => 'hook',
      },
    ]
    const wrapper = mountTable({
      columns,
      slots: { amount: () => 'slot' },
    })

    expect(wrapper.findAll('strong.hook').map((el) => el.text())).toEqual([
      'ACME Corp',
      'Globex',
      'Initech',
    ])
    expect(bodyRows(wrapper).map((row) => row[1])).toEqual([
      'slot',
      'slot',
      'slot',
    ])
  })

  it('renders null and undefined values as empty cells', () => {
    const wrapper = mountTable({
      columns: [
        { id: 'customer', header: 'Customer', accessorKey: 'customer' },
        { id: 'note', header: 'Note', accessorFn: (row) => row.note },
      ],
    })

    expect(bodyRows(wrapper).map((row) => row[1])).toEqual(['', '', ''])
  })

  it('renders the `columns` prop ids in order and skips unknown ids', () => {
    const wrapper = mountTable({
      tableProps: {
        columns: [{ id: 'amount' }, { id: 'missing' }, { id: 'customer' }],
      },
    })

    expect(headerTexts(wrapper)).toEqual(['Amount', 'Customer'])
    expect(bodyRows(wrapper)[0]).toEqual(['1200', 'ACME Corp'])
  })

  it('renders only the current page and follows pagination', async () => {
    const pagination = ref<DataTablePaginationState>({
      pageIndex: 1,
      pageSize: 2,
    })
    const wrapper = mountTable({
      // A getter, so the host render reads (and tracks) the ref.
      rootProps: {
        get pagination() {
          return pagination.value
        },
      },
    })

    expect(bodyRows(wrapper).map((row) => row[0])).toEqual([
      'ACME Corp',
      'Globex',
    ])
    pagination.value = { pageIndex: 2, pageSize: 2 }
    await nextTick()
    expect(bodyRows(wrapper).map((row) => row[0])).toEqual(['Initech'])
  })

  it('marks selected and expanded rows with the root row props', () => {
    const wrapper = mountTable({
      rootProps: {
        enableRowSelection: true,
        enableRowExpansion: true,
        defaultSelectedRowIds: ['inv-2'],
        defaultExpandedRowIds: ['inv-3'],
      },
    })
    const rows = wrapper.findAll('tbody tr')

    expect(rows.map((row) => row.attributes('data-selected'))).toEqual([
      undefined,
      'true',
      undefined,
    ])
    expect(rows.map((row) => row.attributes('data-expanded'))).toEqual([
      undefined,
      undefined,
      'true',
    ])
    expect(rows.every((row) => row.attributes('data-part') === 'row')).toBe(
      true,
    )
  })

  it('keeps the header row when the body is empty', () => {
    const wrapper = mountTable({ rootProps: { defaultGlobalFilter: 'zzz' } })

    expect(headerTexts(wrapper)).toEqual(['Customer', 'Amount'])
    expect(wrapper.findAll('tbody tr')).toHaveLength(0)
  })

  it('merges consumer attributes onto the GhostTable root', () => {
    const wrapper = mountTable({
      tableProps: { class: 'invoices', containHorizontal: true },
    })
    const table = wrapper.get('table')

    expect(table.classes()).toContain('invoices')
    expect(table.attributes('data-ghost-data-table')).toBe('')
    expect(wrapper.find('[role="region"]').exists()).toBe(true)
  })

  it('updates slot content when consumer state changes', async () => {
    const currency = ref('USD')
    const wrapper = mountTable({
      slots: {
        amount: ({ value }) => `${String(value)} ${currency.value}`,
      },
    })

    expect(bodyRows(wrapper)[0]?.[1]).toBe('1200 USD')
    currency.value = 'EUR'
    await nextTick()
    expect(bodyRows(wrapper)[0]?.[1]).toBe('1200 EUR')
  })

  it('throws when rendered outside GhostDataTable', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    expect(() => mount(GhostDataTableTable)).toThrow(
      'GhostDataTableTable must be used inside GhostDataTable',
    )
    warn.mockRestore()
  })
})
