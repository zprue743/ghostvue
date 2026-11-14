/** @vitest-environment jsdom */

import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostScrollArea from '../../packages/vue/src/GhostScrollArea.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

const Fixture = defineComponent({
  setup() {
    return () =>
      h(
        GhostScrollArea,
        { label: 'Feed', style: 'max-block-size: 4rem' },
        {
          default: () =>
            h('div', [
              h('p', 'Line one'),
              h('p', 'Line two'),
              h('p', 'Line three'),
            ]),
        },
      )
  },
})

describe('GhostScrollArea SSR hydration', () => {
  it('hydrates without id or attribute mismatches', async () => {
    await expectSsrHydration(Fixture, {
      assertServerHtml: (html) => {
        expect(html).toContain('ghost-scroll-area')
        expect(html).toContain('data-overflow="none"')
        expect(html).not.toContain('tabindex')
      },
    })
  })
})
