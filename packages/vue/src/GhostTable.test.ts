import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostTable from './GhostTable.vue'
import GhostTableBody from './GhostTableBody.vue'
import GhostTableCaption from './GhostTableCaption.vue'
import GhostTableCell from './GhostTableCell.vue'
import GhostTableFoot from './GhostTableFoot.vue'
import GhostTableHead from './GhostTableHead.vue'
import GhostTableHeaderCell from './GhostTableHeaderCell.vue'
import GhostTableRow from './GhostTableRow.vue'

function basicTableTree() {
  return h(GhostTable, null, {
    default: () => [
      h(GhostTableCaption, () => 'Summary'),
      h(GhostTableHead, () =>
        h(GhostTableRow, () =>
          h(GhostTableHeaderCell, { scope: 'col' }, () => 'Name'),
        ),
      ),
      h(GhostTableBody, () =>
        h(GhostTableRow, () => h(GhostTableCell, () => 'Alex')),
      ),
    ],
  })
}

describe('GhostTable', () => {
  it('renders native table with data hooks', () => {
    const wrapper = mount(GhostTable, {
      slots: { default: '<tbody data-testid="body" />' },
    })
    const table = wrapper.get('table')
    expect(table.classes()).toContain('ghost-table')
    expect(table.attributes('data-part')).toBe('root')
    expect(table.attributes('data-ghost-table')).toBe('')
  })

  it('wraps the table when containHorizontal is true', () => {
    const wrapper = mount(GhostTable, {
      props: { containHorizontal: true },
      slots: { default: '<tbody />' },
    })
    expect(wrapper.find('.ghost-table-scroll-container').exists()).toBe(true)
    const scroll = wrapper.find('.ghost-table-scroll-container')
    expect(scroll.attributes('data-part')).toBe('scroll-container')
    expect(scroll.attributes('tabindex')).toBe('0')
    expect(wrapper.find('table').exists()).toBe(true)
  })

  it('forwards attributes to the table element', () => {
    const wrapper = mount(GhostTable, {
      attrs: { id: 'billing', 'aria-label': 'Billing summary' },
      slots: { default: '<tbody />' },
    })
    const table = wrapper.get('table')
    expect(table.attributes('id')).toBe('billing')
    expect(table.attributes('aria-label')).toBe('Billing summary')
  })

  it('composes caption, sections, and cells with correct parts', () => {
    const wrapper = mount(GhostTable, {
      slots: {
        default: () => [
          h(GhostTableCaption, () => 'Summary'),
          h(GhostTableHead, () =>
            h(GhostTableRow, () =>
              h(GhostTableHeaderCell, { scope: 'col' }, () => 'Name'),
            ),
          ),
          h(GhostTableBody, () =>
            h(GhostTableRow, () => h(GhostTableCell, () => 'Alex')),
          ),
        ],
      },
    })
    expect(wrapper.get('caption').attributes('data-part')).toBe('caption')
    expect(wrapper.get('thead').attributes('data-part')).toBe('head')
    expect(wrapper.get('tbody').attributes('data-part')).toBe('body')
    expect(wrapper.get('th').attributes('data-part')).toBe('header-cell')
    expect(wrapper.get('th').attributes('scope')).toBe('col')
    expect(wrapper.get('td').attributes('data-part')).toBe('cell')
  })

  it('renders deterministic SSR markup with explicit tbody', async () => {
    const html = await renderToString(basicTableTree())
    expect(html).toContain('<table')
    expect(html).toContain('data-ghost-table')
    expect(html).toContain('<thead')
    expect(html).toContain('<tbody')
    expect(html).toContain('scope="col"')
    expect(html).toMatch(/<table[^>]*>[\s\S]*<thead/)
    expect(html).toMatch(/<thead[\s\S]*<tbody/)
  })

  it('exposes foot section hooks', () => {
    const wrapper = mount(GhostTableFoot, {
      slots: { default: '<td>Total</td>' },
    })
    expect(wrapper.get('tfoot').attributes('data-part')).toBe('foot')
    expect(wrapper.get('tfoot').classes()).toContain('ghost-table-foot')
  })
})
