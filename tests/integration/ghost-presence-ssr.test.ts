/** @vitest-environment jsdom */
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostDialog from '../../packages/vue/src/GhostDialog.vue'
import GhostDialogContent from '../../packages/vue/src/GhostDialogContent.vue'
import GhostDialogOverlay from '../../packages/vue/src/GhostDialogOverlay.vue'
import GhostDialogTitle from '../../packages/vue/src/GhostDialogTitle.vue'
import GhostDialogTrigger from '../../packages/vue/src/GhostDialogTrigger.vue'
import GhostPopover from '../../packages/vue/src/GhostPopover.vue'
import GhostPopoverContent from '../../packages/vue/src/GhostPopoverContent.vue'
import GhostPopoverTrigger from '../../packages/vue/src/GhostPopoverTrigger.vue'
import GhostPresence from '../../packages/vue/src/GhostPresence.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

function presenceFixture(present: boolean) {
  return defineComponent({
    name: present ? 'OpenPresenceFixture' : 'ClosedPresenceFixture',
    setup() {
      return () =>
        h('main', [
          h('button', { type: 'button', id: 'toggle' }, 'Toggle'),
          h(GhostPresence, { present }, () =>
            h('aside', { id: 'panel', 'aria-label': 'Inspector' }, 'Panel'),
          ),
        ])
    },
  })
}

describe('GhostPresence and presence hosts SSR hydration', () => {
  it('omits closed presence content and hydrates without mismatch', async () => {
    await expectSsrHydration(presenceFixture(false), {
      assertServerHtml(html) {
        expect(html).toContain('id="toggle"')
        expect(html).not.toContain('Panel')
      },
    })
  })

  it('renders open presence content with data-state="open" and no inert', async () => {
    await expectSsrHydration(presenceFixture(true), {
      assertServerHtml(html) {
        expect(html).toContain('data-state="open"')
        expect(html).not.toContain('inert')
      },
    })
  })

  it('hydrates a defaultOpen Dialog and Popover with open state and no inert', async () => {
    const Hosts = defineComponent({
      name: 'OpenPresenceHostsFixture',
      setup() {
        return () =>
          h('div', [
            h(
              GhostDialog,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDialogTrigger, null, () => 'Open dialog'),
                  h(GhostDialogOverlay),
                  h(GhostDialogContent, null, () =>
                    h(GhostDialogTitle, null, () => 'Rename'),
                  ),
                ],
              },
            ),
            h(
              GhostPopover,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Share'),
                  h(GhostPopoverContent, null, () => 'Share settings'),
                ],
              },
            ),
          ])
      },
    })
    await expectSsrHydration(Hosts, {
      assertServerHtml(html) {
        expect(html).toContain('ghost-dialog-content')
        expect(html).toContain('ghost-dialog-overlay')
        expect(html).toContain('ghost-popover-content')
        expect(html).not.toContain('data-state="closed"')
        expect(html).not.toContain('inert')
      },
    })
  })
})
