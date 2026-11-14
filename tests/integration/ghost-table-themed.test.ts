import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'

import { GhostTable } from '../../packages/themes/src/ghost-table'
import GhostTableBody from '../../packages/vue/src/GhostTableBody.vue'
import GhostTableCell from '../../packages/vue/src/GhostTableCell.vue'
import GhostTableHead from '../../packages/vue/src/GhostTableHead.vue'
import GhostTableHeaderCell from '../../packages/vue/src/GhostTableHeaderCell.vue'
import GhostTableRow from '../../packages/vue/src/GhostTableRow.vue'

describe('themed GhostTable', () => {
  it('scopes recipe CSS without changing table semantics', () => {
    const wrapper = mount(GhostTable, {
      props: { containHorizontal: true },
      slots: {
        default: () => [
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

    expect(wrapper.find('.ghost-themed-scope').exists()).toBe(true)
    expect(wrapper.find('.ghost-table-scroll-container').exists()).toBe(true)
    expect(wrapper.get('table').classes()).toContain('ghost-table')
    expect(wrapper.get('th').attributes('scope')).toBe('col')
  })
})
