import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostTable from '../../packages/vue/src/GhostTable.vue'
import GhostTableBody from '../../packages/vue/src/GhostTableBody.vue'
import GhostTableCaption from '../../packages/vue/src/GhostTableCaption.vue'
import GhostTableCell from '../../packages/vue/src/GhostTableCell.vue'
import GhostTableFoot from '../../packages/vue/src/GhostTableFoot.vue'
import GhostTableHead from '../../packages/vue/src/GhostTableHead.vue'
import GhostTableHeaderCell from '../../packages/vue/src/GhostTableHeaderCell.vue'
import GhostTableRow from '../../packages/vue/src/GhostTableRow.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

const TableFixture = defineComponent({
  setup() {
    return () =>
      h(GhostTable, { containHorizontal: true, id: 'rates' }, () => [
        h(GhostTableCaption, () => 'Regional rates'),
        h(GhostTableHead, () =>
          h(GhostTableRow, () => [
            h(GhostTableHeaderCell, { scope: 'col' }, () => 'Region'),
            h(GhostTableHeaderCell, { scope: 'col' }, () => 'Rate'),
          ]),
        ),
        h(GhostTableBody, () =>
          h(GhostTableRow, () => [
            h(GhostTableCell, () => 'US'),
            h(GhostTableCell, () => 'Standard'),
          ]),
        ),
        h(GhostTableFoot, () =>
          h(GhostTableRow, () => h(GhostTableCell, { colspan: 2 }, () => 'Q3')),
        ),
      ])
  },
})

describe('GhostTable SSR hydration', () => {
  it('hydrates composed tables without tbody insertion mismatches', async () => {
    await expectSsrHydration(TableFixture, {
      assertServerHtml(html) {
        expect(html).toContain('data-part="scroll-container"')
        expect(html).toContain('<tbody')
        expect(html).toContain('<tfoot')
        expect(html).toContain('scope="col"')
        expect(html).toContain('id="rates"')
      },
    })
  })
})
