import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import PaginatedInvoices from '../../examples/data-table/paginated-invoices.vue'

type Wrapper = ReturnType<typeof mount<typeof PaginatedInvoices>>

function invoiceIds(wrapper: Wrapper): string[] {
  return wrapper
    .findAll('tbody tr')
    .map((row) => row.findAll('td')[0]?.text() ?? '')
}

function currentPage(wrapper: Wrapper): string {
  return wrapper.get('button[aria-current="page"]').text()
}

function status(wrapper: Wrapper): string {
  return wrapper.get('.paginated-invoices__status').text()
}

async function search(wrapper: Wrapper, value: string): Promise<void> {
  await wrapper.get('input[type="search"]').setValue(value)
  // The clamp watcher writes the pagination v-model after the filter render.
  await nextTick()
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('data-table/paginated-invoices example (GhostPagination wiring)', () => {
  it('drives GhostPagination from the root pagination bindings', async () => {
    const wrapper = mount(PaginatedInvoices, { attachTo: document.body })
    const nav = wrapper.get('nav')
    expect(nav.attributes('aria-label')).toBe('Invoice pages')
    expect(status(wrapper)).toBe('23 invoices, page 1 of 5')
    expect(invoiceIds(wrapper)).toEqual([
      'inv-01',
      'inv-02',
      'inv-03',
      'inv-04',
      'inv-05',
    ])

    await wrapper.get('button[aria-label="Page 5"]').trigger('click')
    expect(currentPage(wrapper)).toBe('5')
    expect(status(wrapper)).toBe('23 invoices, page 5 of 5')
    expect(invoiceIds(wrapper)).toEqual(['inv-21', 'inv-22', 'inv-23'])
  })

  it('clamps the page to the filtered page count instead of resetting', async () => {
    const wrapper = mount(PaginatedInvoices, { attachTo: document.body })
    await wrapper.get('button[aria-label="Page 5"]').trigger('click')

    // Six Initech invoices → two pages; page 5 clamps to the last page.
    await search(wrapper, 'initech')
    expect(status(wrapper)).toBe('6 invoices, page 2 of 2')
    expect(currentPage(wrapper)).toBe('2')
    expect(invoiceIds(wrapper)).toEqual(['inv-23'])

    // Widening the filter keeps the clamped page; it never jumps back.
    await search(wrapper, '')
    expect(status(wrapper)).toBe('23 invoices, page 2 of 5')
  })

  it('shows page 1 of 1 and the empty state when nothing matches', async () => {
    const wrapper = mount(PaginatedInvoices, { attachTo: document.body })
    await wrapper.get('button[aria-label="Page 3"]').trigger('click')
    await search(wrapper, 'no such customer')
    expect(status(wrapper)).toBe('0 invoices, page 1 of 1')
    expect(currentPage(wrapper)).toBe('1')
    expect(wrapper.find('button[aria-label="Page 2"]').exists()).toBe(false)
    expect(wrapper.get('thead').findAll('th')).toHaveLength(3)
    expect(wrapper.text()).toContain('No invoices')
  })
})
