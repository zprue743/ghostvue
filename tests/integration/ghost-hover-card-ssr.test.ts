import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostHoverCard from '../../packages/vue/src/GhostHoverCard.vue'
import GhostHoverCardContent from '../../packages/vue/src/GhostHoverCardContent.vue'
import GhostHoverCardTrigger from '../../packages/vue/src/GhostHoverCardTrigger.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

describe('GhostHoverCard SSR hydration', () => {
  it('hydrates closed GhostHoverCard without mismatch', async () => {
    const Closed = defineComponent({
      name: 'ClosedHoverCardFixture',
      setup() {
        return () =>
          h(GhostHoverCard, null, {
            default: () => [
              h(GhostHoverCardTrigger, null, () => 'Closed preview trigger'),
              h(GhostHoverCardContent, null, () => 'Hidden SSR hover card'),
            ],
          })
      },
    })

    await expectSsrHydration(Closed, {
      assertServerHtml(html) {
        expect(html).toContain('Closed preview trigger')
        expect(html).toContain('aria-expanded="false"')
        expect(html).not.toContain('Hidden SSR hover card')
      },
    })
  })

  it('hydrates defaultOpen GhostHoverCard without mismatch', async () => {
    const Open = defineComponent({
      name: 'OpenHoverCardFixture',
      setup() {
        return () =>
          h(
            GhostHoverCard,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostHoverCardTrigger, null, () => 'Open preview trigger'),
                h(GhostHoverCardContent, null, () => 'Visible SSR hover card'),
              ],
            },
          )
      },
    })

    await expectSsrHydration(Open, {
      assertServerHtml(html) {
        expect(html).toContain('Open preview trigger')
        expect(html).toContain('aria-expanded="true"')
        expect(html).toContain('Visible SSR hover card')
        expect(html).toContain('role="dialog"')
      },
    })
  })
})
