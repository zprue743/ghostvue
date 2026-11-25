import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { effectScope, h, ref } from 'vue'

import GhostCheckbox from './GhostCheckbox.vue'
import {
  getDataTableHeaderCellProps,
  getDataTableHeaderSelectionCheckboxProps,
  getDataTableRowExpandButtonProps,
  getDataTableRowSelectionCheckboxProps,
  getDataTableSortButtonProps,
} from './data-table-interaction'
import type { DataTableColumnDef, DataTableRowId } from './ghost-data-table'
import { useGhostDataTable } from './use-ghost-data-table'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const invoices: Invoice[] = [
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
]

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'amount', header: 'Amount', accessorKey: 'amount' },
  { id: 'actions', header: 'Actions' },
]

/** Standalone composable (escape hatch 3: no GhostDataTable root). */
function createTable(
  options: {
    disabled?: boolean
    enableRowSelection?: boolean
    enableRowExpansion?: boolean
    expanded?: DataTableRowId[]
  } = {},
) {
  const disabled = ref(options.disabled ?? false)
  const scope = effectScope()
  const table = scope.run(() =>
    useGhostDataTable<Invoice>({
      data: invoices,
      columns,
      getRowId: (row) => row.id,
      disabled,
      enableRowSelection: options.enableRowSelection ?? true,
      enableRowExpansion: options.enableRowExpansion ?? true,
      defaultExpandedRowIds: options.expanded ?? [],
    }),
  )
  if (!table) throw new Error('scope did not run')
  return { table, disabled }
}

describe('DataTable interaction prop helpers', () => {
  it('puts aria-sort on the sorted header cell only and follows the tri-state cycle', () => {
    const { table } = createTable()
    expect(getDataTableHeaderCellProps(table, 'amount')).toEqual({
      scope: 'col',
    })
    table.toggleSorting('amount')
    expect(getDataTableHeaderCellProps(table, 'amount')).toEqual({
      scope: 'col',
      'aria-sort': 'ascending',
      'data-sort': 'asc',
    })
    expect(getDataTableHeaderCellProps(table, 'customer')).toEqual({
      scope: 'col',
    })
    table.toggleSorting('amount')
    expect(getDataTableHeaderCellProps(table, 'amount')['aria-sort']).toBe(
      'descending',
    )
    table.toggleSorting('amount')
    expect(getDataTableHeaderCellProps(table, 'amount')).toEqual({
      scope: 'col',
    })
  })

  it('moves aria-sort to a newly sorted column, which starts ascending', () => {
    const { table } = createTable()
    table.toggleSorting('amount')
    table.toggleSorting('amount')
    expect(getDataTableHeaderCellProps(table, 'amount')['aria-sort']).toBe(
      'descending',
    )
    // Single-column sort: a different column replaces the entry at `asc`,
    // so only one <th> ever announces a direction.
    table.toggleSorting('customer')
    expect(table.sorting.value).toEqual([{ id: 'customer', desc: false }])
    expect(getDataTableHeaderCellProps(table, 'customer')['aria-sort']).toBe(
      'ascending',
    )
    expect(getDataTableHeaderCellProps(table, 'amount')).toEqual({
      scope: 'col',
    })
  })

  it('labels the sort button itself and never gives it aria-sort', () => {
    const { table, disabled } = createTable()
    table.toggleSorting('amount')
    expect(
      getDataTableSortButtonProps(table, 'amount', { label: 'Sort by amount' }),
    ).toEqual({ type: 'button', 'aria-label': 'Sort by amount' })
    // Visible text can be the name: no label means no empty aria-label.
    expect(getDataTableSortButtonProps(table, 'amount')).toEqual({
      type: 'button',
    })
    expect(getDataTableSortButtonProps(table, 'amount', { label: '' })).toEqual(
      { type: 'button' },
    )
    expect(getDataTableSortButtonProps(table, 'actions').disabled).toBe(true)
    disabled.value = true
    expect(getDataTableSortButtonProps(table, 'amount').disabled).toBe(true)
  })

  it('labels row and header selection checkboxes and disables them when inert', () => {
    const { table, disabled } = createTable()
    expect(
      getDataTableRowSelectionCheckboxProps(table, 'inv-1', {
        label: 'Select invoice inv-1',
      }),
    ).toEqual({ disabled: false, 'aria-label': 'Select invoice inv-1' })
    expect(
      getDataTableHeaderSelectionCheckboxProps(table, {
        label: 'Select all invoices',
      }),
    ).toEqual({ disabled: false, 'aria-label': 'Select all invoices' })
    disabled.value = true
    expect(getDataTableRowSelectionCheckboxProps(table, 'inv-1').disabled).toBe(
      true,
    )
    const { table: off } = createTable({ enableRowSelection: false })
    expect(getDataTableHeaderSelectionCheckboxProps(off).disabled).toBe(true)
  })

  it('lands the checkbox label on the focusable native input, not a wrapper', () => {
    const { table } = createTable()
    const wrapper = mount(() =>
      h(GhostCheckbox, {
        ...getDataTableRowSelectionCheckboxProps(table, 'inv-2', {
          label: 'Select invoice inv-2',
        }),
        modelValue: false,
      }),
    )
    const input = wrapper.get('input[type="checkbox"]')
    expect(wrapper.element).toBe(input.element)
    expect(input.attributes('aria-label')).toBe('Select invoice inv-2')
    expect(input.attributes('disabled')).toBeUndefined()
  })

  it('names the expand button and points aria-controls at the open detail row only', () => {
    const { table } = createTable({ expanded: ['inv-2'] })
    const options = {
      label: 'Show details for inv-2',
      id: 'expand-inv-2',
      detailRowId: 'detail-inv-2',
    }
    expect(getDataTableRowExpandButtonProps(table, 'inv-2', options)).toEqual({
      type: 'button',
      id: 'expand-inv-2',
      'aria-label': 'Show details for inv-2',
      'aria-expanded': 'true',
      'aria-controls': 'detail-inv-2',
    })
    table.toggleRowExpanded('inv-2')
    expect(getDataTableRowExpandButtonProps(table, 'inv-2', options)).toEqual({
      type: 'button',
      id: 'expand-inv-2',
      'aria-label': 'Show details for inv-2',
      'aria-expanded': 'false',
    })
    // No ids passed: still a named toggle with aria-expanded.
    expect(getDataTableRowExpandButtonProps(table, 'inv-1')).toEqual({
      type: 'button',
      'aria-expanded': 'false',
    })
  })

  it('disables the expand button while expansion is off or the table is disabled', () => {
    const { table: off } = createTable({ enableRowExpansion: false })
    expect(getDataTableRowExpandButtonProps(off, 'inv-1').disabled).toBe(true)
    const { table, disabled } = createTable()
    expect(getDataTableRowExpandButtonProps(table, 'inv-1').disabled).toBe(
      undefined,
    )
    disabled.value = true
    expect(getDataTableRowExpandButtonProps(table, 'inv-1').disabled).toBe(true)
  })
})
