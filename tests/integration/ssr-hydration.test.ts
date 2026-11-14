import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostButton from '../../packages/vue/src/GhostButton.vue'
import GhostCollapsible from '../../packages/vue/src/GhostCollapsible.vue'
import GhostCollapsibleContent from '../../packages/vue/src/GhostCollapsibleContent.vue'
import GhostCollapsibleTrigger from '../../packages/vue/src/GhostCollapsibleTrigger.vue'
import GhostDropdownMenu from '../../packages/vue/src/GhostDropdownMenu.vue'
import GhostDropdownMenuContent from '../../packages/vue/src/GhostDropdownMenuContent.vue'
import GhostDropdownMenuTrigger from '../../packages/vue/src/GhostDropdownMenuTrigger.vue'
import GhostInlineAlert from '../../packages/vue/src/GhostInlineAlert.vue'
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

  it('hydrates closed GhostDropdownMenu without mismatch', async () => {
    const ClosedMenu = defineComponent({
      name: 'ClosedDropdownMenuFixture',
      setup() {
        return () =>
          h(GhostDropdownMenu, null, {
            default: () => [
              h(GhostDropdownMenuTrigger, null, () => 'Menu trigger'),
              h(GhostDropdownMenuContent, null, () => 'Hidden menu panel'),
            ],
          })
      },
    })

    await expectSsrHydration(ClosedMenu, {
      assertServerHtml(html) {
        expect(html).toContain('Menu trigger')
        expect(html).toContain('aria-expanded="false"')
        expect(html).toContain('aria-haspopup="menu"')
        expect(html).not.toContain('Hidden menu panel')
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

  it('rejects when client render text disagrees with SSR HTML', async () => {
    const phase = { value: 'server' as 'server' | 'client' }
    const MismatchContent = defineComponent({
      name: 'MismatchContentFixture',
      setup() {
        return () =>
          h(
            'div',
            null,
            phase.value === 'server' ? 'server markup' : 'client markup',
          )
      },
    })

    await expect(
      expectSsrHydration(MismatchContent, {
        beforeHydrate: () => {
          phase.value = 'client'
        },
      }),
    ).rejects.toThrow()
  })

  it('hydrates GhostInlineAlert title id without mismatch', async () => {
    await expectSsrHydration(
      ssrHydrationRoot(
        GhostInlineAlert,
        { as: 'section', headingLevel: 2 },
        {
          title: () => 'Load failed',
          message: () => 'Rows are unavailable.',
        },
      ),
      {
        assertServerHtml(html) {
          expect(html).toContain('data-ghost-inline-alert')
          expect(html).toContain('aria-labelledby=')
          expect(html).toContain('<h2')
          expect(html).toContain('Load failed')
        },
      },
    )
  })

  it('rejects when hydrated ids disagree with SSR HTML', async () => {
    const phase = { value: 'server' as 'server' | 'client' }
    const MismatchId = defineComponent({
      name: 'MismatchIdFixture',
      setup() {
        return () =>
          phase.value === 'server'
            ? h('div', { id: 'ssr-only-id' }, 'stable copy')
            : h('div', { id: 'client-only-id' }, 'stable copy')
      },
    })

    await expect(
      expectSsrHydration(MismatchId, {
        beforeHydrate: () => {
          phase.value = 'client'
        },
      }),
    ).rejects.toThrow()
  })
})
