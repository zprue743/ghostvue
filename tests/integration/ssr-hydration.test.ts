import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostButton from '../../packages/vue/src/GhostButton.vue'
import GhostCollapsible from '../../packages/vue/src/GhostCollapsible.vue'
import GhostCollapsibleContent from '../../packages/vue/src/GhostCollapsibleContent.vue'
import GhostCollapsibleTrigger from '../../packages/vue/src/GhostCollapsibleTrigger.vue'
import { expectSsrHydration, ssrHydrationRoot } from '../support/ssr-hydration'

describe('SSR hydration harness', () => {
  it('hydrates GhostButton without mismatch', async () => {
    await expectSsrHydration(
      ssrHydrationRoot(
        GhostButton,
        { disabled: true, type: 'submit' },
        {
          default: () => 'Save',
        },
      ),
      {
        assertServerHtml(html) {
          expect(html).toContain('class="ghost-button"')
          expect(html).toContain('type="submit"')
          expect(html).toContain('disabled')
          expect(html).not.toContain('aria-busy')
        },
      },
    )
  })

  it('hydrates closed GhostCollapsible without mismatch', async () => {
    const Closed = defineComponent({
      name: 'ClosedCollapsibleFixture',
      setup() {
        return () =>
          h(GhostCollapsible, null, {
            default: () => [
              h(GhostCollapsibleTrigger, null, () => 'Closed disclosure'),
              h(GhostCollapsibleContent, null, () => 'Hidden SSR disclosure'),
            ],
          })
      },
    })

    await expectSsrHydration(Closed, {
      assertServerHtml(html) {
        expect(html).toContain('Closed disclosure')
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('Hidden SSR disclosure')
        expect(html).toContain('hidden')
      },
    })
  })

  it('hydrates defaultOpen GhostCollapsible without mismatch', async () => {
    const Open = defineComponent({
      name: 'OpenCollapsibleFixture',
      setup() {
        return () =>
          h(
            GhostCollapsible,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostCollapsibleTrigger, null, () => 'Open disclosure'),
                h(
                  GhostCollapsibleContent,
                  null,
                  () => 'Visible SSR disclosure',
                ),
              ],
            },
          )
      },
    })

    await expectSsrHydration(Open, {
      assertServerHtml(html) {
        expect(html).toContain('Open disclosure')
        expect(html).toContain('aria-expanded="true"')
        expect(html).toContain('Visible SSR disclosure')
        expect(html).not.toContain(' hidden')
      },
    })
  })
})
