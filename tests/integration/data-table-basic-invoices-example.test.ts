import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import BasicInvoices from '../../examples/data-table/basic-invoices.vue'

type BasicWrapper = ReturnType<typeof mount<typeof BasicInvoices>>

function mountBasic(): BasicWrapper {
  return mount(BasicInvoices, { attachTo: document.body })
}

function bodyRows(wrapper: BasicWrapper): string[][] {
  return wrapper
    .findAll('tbody tr')
    .map((row) => row.findAll('td').map((td) => td.text()))
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('data-table/basic-invoices example (spec example a)', () => {
  it('renders the table shell from column defs with the #amount currency slot', () => {
    const wrapper = mountBasic()
    const table = wrapper.get('table')

    expect(table.attributes('data-ghost-data-table')).toBe('')
    expect(table.attributes('aria-label')).toBe('Invoices')
    expect(wrapper.findAll('thead th').map((th) => th.text())).toEqual([
      'Customer',
      'Amount',
    ])
    // No empty <th>: every header cell has a name.
    for (const th of wrapper.findAll('thead th')) {
      expect(th.text()).not.toBe('')
    }
    expect(bodyRows(wrapper)).toEqual([
      ['ACME Corp', '1200.00 USD'],
      ['Globex', '980.50 USD'],
    ])
  })

  it('sorts from the header buttons', async () => {
    const wrapper = mountBasic()
    const [customerHeader, amountHeader] = wrapper.findAll('thead th')

    await amountHeader?.get('button').trigger('click')
    expect(amountHeader?.attributes('aria-sort')).toBe('ascending')
    expect(bodyRows(wrapper).map((row) => row[0])).toEqual([
      'Globex',
      'ACME Corp',
    ])

    await customerHeader?.get('button').trigger('click')
    expect(customerHeader?.attributes('aria-sort')).toBe('ascending')
    expect(amountHeader?.attributes('aria-sort')).toBeUndefined()
    expect(bodyRows(wrapper).map((row) => row[0])).toEqual([
      'ACME Corp',
      'Globex',
    ])
  })

  it('renders GhostPagination next to the table', () => {
    const wrapper = mountBasic()
    const nav = wrapper.get('nav[aria-label="Pagination"]')

    expect(nav.find('[aria-current="page"]').text()).toBe('1')
  })
})
