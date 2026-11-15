import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import {
  GhostSegmentedControl,
  GhostSegmentedControlItem,
} from '../../packages/vue/src/index'
import { expectSsrHydration } from '../support/ssr-hydration'

const SegmentedFixture = defineComponent({
  name: 'SegmentedHydrationFixture',
  setup: () => () =>
    h(
      GhostSegmentedControl,
      { defaultValue: 'grid', 'aria-label': 'Layout' },
      {
        default: () => [
          h(GhostSegmentedControlItem, { value: 'list' }, () => 'List'),
          h(GhostSegmentedControlItem, { value: 'grid' }, () => 'Grid'),
        ],
      },
    ),
})

describe('GhostSegmentedControl SSR hydration', () => {
  it('hydrates without id or attribute mismatches', async () => {
    await expectSsrHydration(SegmentedFixture, {
      assertServerHtml(html) {
        expect(html).toContain('ghost-segmented-control')
        expect(html).toContain('data-part="indicator"')
        expect(html).toMatch(/--ghost-segmented-selected-index:\s*1/)
      },
    })
  })
})
