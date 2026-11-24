import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

import { defineDataTableColumns } from './define-data-table-columns'
import type { DataTableCellContext } from './ghost-data-table'
import { useGhostDataTable } from './use-ghost-data-table'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const acme: Invoice = { id: 'inv-1', customer: 'ACME Corp', amount: 1200 }
const globex: Invoice = { id: 'inv-2', customer: 'Globex', amount: 980.5 }
const initech: Invoice = { id: 'inv-3', customer: 'Initech', amount: 42 }
const invoices: Invoice[] = [acme, globex, initech]

function contextFor(
  row: Invoice,
  overrides: Partial<DataTableCellContext<Invoice>> = {},
): DataTableCellContext<Invoice> {
  return {
    row,
    rowId: row.id,
    rowIndex: 0,
    column: { id: 'unused' },
    getValue: () => 'generic',
    ...overrides,
  }
}

describe('defineDataTableColumns', () => {
  it('builds an accessorKey column whose id defaults to the key', () => {
    const columns = defineDataTableColumns<Invoice>()

    expect(
      columns.accessorKey('amount', { header: 'Amount', enableSorting: true }),
    ).toEqual({
      id: 'amount',
      header: 'Amount',
      enableSorting: true,
      accessorKey: 'amount',
    })
    expect(columns.accessorKey('amount', { id: 'total' }).id).toBe('total')
  })

  it('builds an accessorFn column with the given id', () => {
    const columns = defineDataTableColumns<Invoice>()
    const accessorFn = (row: Invoice) => row.amount * 2

    const column = columns.accessorFn('double', { header: 'x2', accessorFn })

    expect(column).toEqual({ id: 'double', header: 'x2', accessorFn })
    expect(column.accessorKey).toBeUndefined()
  })

  it('passes the accessorKey value as `value` and `getValue()` to cell', () => {
    const columns = defineDataTableColumns<Invoice>()
    let received: Record<string, unknown> = {}
    const column = columns.accessorKey('amount', {
      cell: (context) => {
        const { getValue, ...rest } = context
        received = rest
        return `${context.value.toFixed(2)}|${getValue().toFixed(2)}`
      },
    })

    const context = contextFor(globex, { rowIndex: 1, column })
    expect(column.cell?.(context)).toBe('980.50|980.50')
    expect(received).toEqual({
      row: globex,
      rowId: 'inv-2',
      rowIndex: 1,
      column,
      value: 980.5,
    })
  })

  it('passes the accessorFn result as `value` with the row index', () => {
    const columns = defineDataTableColumns<Invoice>()
    const accessorFn = vi.fn(
      (row: Invoice, index: number) => `${row.customer}#${String(index)}`,
    )
    const column = columns.accessorFn('label', {
      accessorFn,
      cell: ({ value, getValue }) => `${value}|${getValue()}`,
    })

    expect(column.cell?.(contextFor(acme, { rowIndex: 4 }))).toBe(
      'ACME Corp#4|ACME Corp#4',
    )
    // One read per cell render: `value` and `getValue()` share it.
    expect(accessorFn).toHaveBeenCalledTimes(1)
  })

  it('omits cell when none is given and never mutates the options object', () => {
    const columns = defineDataTableColumns<Invoice>()
    const cell = () => 'x'
    const options = Object.freeze({ header: 'Customer', cell })

    const withCell = columns.accessorKey('customer', options)
    const withoutCell = columns.accessorKey('customer', { header: 'Customer' })

    expect(withCell.cell).not.toBe(cell)
    expect(options).toEqual({ header: 'Customer', cell })
    expect('cell' in withoutCell).toBe(false)
  })

  it('does not mutate the incoming cell context', () => {
    const columns = defineDataTableColumns<Invoice>()
    const column = columns.accessorKey('amount', { cell: ({ value }) => value })
    const context = Object.freeze(contextFor(acme))

    expect(column.cell?.(context)).toBe(1200)
    expect(context.getValue()).toBe('generic')
  })

  it('produces columns that useGhostDataTable sorts and filters', () => {
    const columns = defineDataTableColumns<Invoice>()
    const table = useGhostDataTable({
      data: ref(invoices),
      columns: [
        columns.accessorKey('customer', { header: 'Customer' }),
        columns.accessorKey('amount', { header: 'Amount' }),
        columns.accessorFn('tier', {
          accessorFn: (row) => (row.amount >= 1000 ? 'large' : 'small'),
        }),
      ],
      getRowId: (row) => row.id,
      defaultSorting: [{ id: 'amount', desc: false }],
    })

    expect(table.getRowModel().map((entry) => entry.rowId)).toEqual([
      'inv-3',
      'inv-2',
      'inv-1',
    ])

    table.setColumnFilter('tier', 'large')
    expect(table.getRowModel().map((entry) => entry.rowId)).toEqual(['inv-1'])
  })
})
