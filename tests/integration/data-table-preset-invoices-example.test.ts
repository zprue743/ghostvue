import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'

import PresetInvoices from '../../examples/data-table/preset-invoices.vue'

type PresetWrapper = ReturnType<typeof mount<typeof PresetInvoices>>

function mountPreset(): PresetWrapper {
  return mount(PresetInvoices, { attachTo: document.body })
}

function customers(wrapper: PresetWrapper): string[] {
  return wrapper
    .findAll('tbody tr:not([data-detail-row])')
    .map((row) => row.findAll('td')[2]?.text() ?? '')
}

/** Lines with any non-whitespace character (the spec's LOC measure). */
function nonBlankLines(source: string): number {
  return source.split('\n').filter((line) => line.trim() !== '').length
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('data-table/preset-invoices example (spec example a′)', () => {
  it('stays within the ≤ 95 non-blank consumer line budget (Preset LOC decision)', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'examples/data-table/preset-invoices.vue'),
      'utf8',
    )
    // The spec's PrimeVue baseline is 95 lines for sort, filter, paginate,
    // select, and expand. The count includes the example's layout CSS.
    expect(nonBlankLines(source)).toBeLessThanOrEqual(95)
  })

  it('renders search, named headers, and the typed #amount slot', () => {
    const wrapper = mountPreset()
    const table = wrapper.get('table')

    expect(table.attributes('aria-label')).toBe('Invoices')
    expect(wrapper.get('label').text()).toBe('Search invoices')
    expect(
      wrapper
        .findAll('thead th')
        .map((th) => th.attributes('aria-label') ?? th.text()),
    ).toEqual(['Selection', 'Details', 'Customer', 'Amount'])
    expect(
      wrapper
        .findAll('tbody tr:not([data-detail-row]) td:nth-child(4)')[0]
        ?.text(),
    ).toBe('1200.00 USD')
  })

  it('pages, sorts, filters, selects, and expands (invoice parity)', async () => {
    const wrapper = mountPreset()

    // Paginate: 6 invoices at 5 per page.
    expect(customers(wrapper)).toHaveLength(5)
    await wrapper.get('nav button[aria-label="Page 2"]').trigger('click')
    expect(customers(wrapper)).toEqual(['Stark Industries'])
    await wrapper.get('nav button[aria-label="Page 1"]').trigger('click')

    // Sort by amount ascending.
    await wrapper.findAll('thead th')[3]?.get('button').trigger('click')
    expect(customers(wrapper).slice(0, 2)).toEqual(['Initech', 'Hooli'])

    // Select: inv-2 starts selected; the header is mixed.
    const header = wrapper.get<HTMLInputElement>('thead input')
    expect(header.element.indeterminate).toBe(true)

    // Expand: inv-2 starts expanded with its #detail content.
    expect(wrapper.get('tr[data-detail-row]').text()).toBe(
      'inv-2 was billed to Globex.',
    )

    // Filter to nothing: head stays, empty state shows, pager is 1 of 1.
    await wrapper.get('input[type="search"]').setValue('zzz')
    expect(wrapper.findAll('thead th')).toHaveLength(4)
    expect(wrapper.get('tbody h2').text()).toBe('No invoices')
    expect(wrapper.findAll('nav button[aria-label^="Page"]')).toHaveLength(1)
  })
})
