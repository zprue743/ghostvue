import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import FullInvoices from '../../examples/data-table/full-invoices.vue'

type FullWrapper = ReturnType<typeof mount<typeof FullInvoices>>

function mountFull(): FullWrapper {
  return mount(FullInvoices, { attachTo: document.body })
}

function byLabel(wrapper: FullWrapper, label: string) {
  return wrapper.get(`[aria-label="${label}"]`)
}

/** Customer column text of each data row (detail rows excluded). */
function bodyCustomers(wrapper: FullWrapper): string[] {
  return wrapper
    .findAll('tbody tr:not([data-detail-row])')
    .map((row) => row.findAll('td')[2]?.text() ?? '')
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('data-table/full-invoices example (approval fixture b)', () => {
  it('composes a native table with tableRootProps and no grid semantics', () => {
    const wrapper = mountFull()
    const table = wrapper.get('table')
    expect(table.attributes('data-ghost-data-table')).toBe('')
    expect(table.attributes('aria-label')).toBe('Invoices')
    expect(table.attributes('aria-busy')).toBeUndefined()
    expect(table.attributes('data-part')).toBe('root')
    expect(wrapper.find('[role="grid"]').exists()).toBe(false)
    expect(wrapper.find('[tabindex]').exists()).toBe(false)
    const columnHeaders = wrapper.findAll('thead th')
    expect(columnHeaders.map((th) => th.attributes('scope'))).toEqual([
      'col',
      'col',
      'col',
      'col',
    ])
  })

  it('cycles sort from the header button and puts aria-sort on the th only', async () => {
    const wrapper = mountFull()
    const amountButton = byLabel(wrapper, 'Amount sort')
    expect(amountButton.attributes('type')).toBe('button')
    expect(amountButton.attributes('aria-sort')).toBeUndefined()
    const amountHeader = () => wrapper.findAll('thead th')[3]
    expect(amountHeader()?.attributes('aria-sort')).toBeUndefined()

    await amountButton.trigger('click')
    expect(amountHeader()?.attributes('aria-sort')).toBe('ascending')
    expect(amountHeader()?.attributes('data-sort')).toBe('asc')
    expect(bodyCustomers(wrapper)).toEqual(['Initech', 'Globex', 'ACME Corp'])
    // The column `cell` hook renders the amount cell.
    expect(wrapper.findAll('tbody tr')[0]?.findAll('td')[3]?.text()).toBe(
      '42.00 USD (Initech)',
    )
    // Single-column sort: the other header carries no aria-sort.
    expect(wrapper.findAll('thead th')[2]?.attributes('aria-sort')).toBe(
      undefined,
    )

    await amountButton.trigger('click')
    expect(amountHeader()?.attributes('aria-sort')).toBe('descending')
    await amountButton.trigger('click')
    expect(amountHeader()?.attributes('aria-sort')).toBeUndefined()
    expect(amountHeader()?.attributes('data-sort')).toBeUndefined()
  })

  it('gives every header cell a name and every sortable column a labeled sort button', () => {
    const wrapper = mountFull()
    const headers = wrapper.findAll('thead th')
    // No empty <th>: the icon-only selection header is named by aria-label.
    expect(
      headers.map((th) => th.attributes('aria-label') ?? th.text()),
    ).toEqual(['Selection', 'Details', 'Customer', 'Amount'])
    const sortButtons = wrapper.findAll('thead button')
    expect(
      sortButtons.map((button) => button.attributes('aria-label')),
    ).toEqual(['Customer sort', 'Amount sort'])
    for (const button of sortButtons) {
      expect(button.attributes('type')).toBe('button')
      expect(button.attributes('disabled')).toBeUndefined()
    }
  })

  it('moves aria-sort to the other column when sorting switches', async () => {
    const wrapper = mountFull()
    await byLabel(wrapper, 'Amount sort').trigger('click')
    await byLabel(wrapper, 'Amount sort').trigger('click')
    await byLabel(wrapper, 'Customer sort').trigger('click')
    const sorted = wrapper.findAll('thead th[aria-sort]')
    expect(sorted).toHaveLength(1)
    expect(sorted[0]?.text()).toBe('Customer')
    expect(sorted[0]?.attributes('aria-sort')).toBe('ascending')
    expect(bodyCustomers(wrapper)).toEqual(['ACME Corp', 'Globex', 'Initech'])
  })

  it('names row checkboxes on the native input and syncs data-selected', async () => {
    const wrapper = mountFull()
    const checkbox = byLabel(wrapper, 'Select invoice inv-2')
    expect(checkbox.element.tagName).toBe('INPUT')
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
    const inv2Row = () => wrapper.get('tbody tr[data-selected]')
    expect(inv2Row().text()).toContain('Globex')

    await checkbox.setValue(false)
    expect(wrapper.find('tbody tr[data-selected]').exists()).toBe(false)

    await byLabel(wrapper, 'Select invoice inv-1').setValue(true)
    expect(inv2Row().text()).toContain('ACME Corp')
  })

  it('toggles every filtered row from the header checkbox with an indeterminate mixed state', async () => {
    const wrapper = mountFull()
    // `indeterminate` is a DOM property applied after mount (checkbox spec).
    await nextTick()
    const header = byLabel(wrapper, 'Select all invoices matching filters')
    const input = header.element as HTMLInputElement
    expect(input.indeterminate).toBe(true)
    expect(input.checked).toBe(false)

    await header.setValue(true)
    expect(input.checked).toBe(true)
    expect(input.indeterminate).toBe(false)
    expect(wrapper.findAll('tbody tr[data-selected]')).toHaveLength(3)

    await header.setValue(false)
    expect(wrapper.findAll('tbody tr[data-selected]')).toHaveLength(0)
  })

  it('wires the expand button to the detail row and keeps the row part', async () => {
    const wrapper = mountFull()
    const button = byLabel(wrapper, 'Show details for inv-2')
    expect(button.attributes('type')).toBe('button')
    expect(button.attributes('aria-expanded')).toBe('true')
    const detail = wrapper.get('tr[data-detail-row="true"]')
    expect(detail.attributes('data-part')).toBe('row')
    expect(button.attributes('aria-controls')).toBe(detail.attributes('id'))
    expect(wrapper.get('tbody tr[data-expanded]').text()).toContain('Globex')
    // Detail <tr> immediately follows its data row.
    expect(
      wrapper.get('tbody tr[data-expanded]').element.nextElementSibling,
    ).toBe(detail.element)

    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('false')
    expect(button.attributes('aria-controls')).toBeUndefined()
    expect(wrapper.find('tr[data-detail-row]').exists()).toBe(false)

    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('tr[data-detail-row]').text()).toBe('Details for inv-2')
  })

  it('keeps the header mounted and shows the empty state when the filter matches nothing', async () => {
    const wrapper = mountFull()
    await wrapper.get('input[type="search"]').setValue('zzz')
    expect(wrapper.findAll('thead th')).toHaveLength(4)
    expect(wrapper.get('[data-part="title"]').text()).toBe('No invoices')
    expect(wrapper.get('tbody td').attributes('colspan')).toBe('4')

    await wrapper.get('input[type="search"]').setValue('glo')
    expect(bodyCustomers(wrapper)).toEqual(['Globex'])
  })
})
