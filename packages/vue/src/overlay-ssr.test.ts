/** @vitest-environment node */

import { createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostPopover from './GhostPopover.vue'
import GhostPopoverClose from './GhostPopoverClose.vue'
import GhostPopoverContent from './GhostPopoverContent.vue'
import GhostPopoverTrigger from './GhostPopoverTrigger.vue'
import GhostPortal from './GhostPortal.vue'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFloating } from './use-floating'
import { useInertOthers } from './use-inert-others'
import { useScrollLock } from './use-scroll-lock'

describe('overlay primitives in Node SSR (no window or document)', () => {
  it('renders all overlay and modal primitives without window or document globals', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const Comp = defineComponent({
      setup() {
        const anchor = ref<HTMLElement | null>(null)
        const floating = ref<HTMLElement | null>(null)

        useDismissableLayer(floating, { onDismiss: () => undefined })
        useScrollLock(true)
        useInertOthers(floating, true)
        const { x, y, placement } = useFloating(anchor, floating, {
          placement: 'right',
        })

        return () =>
          h('div', [
            h('button', { ref: anchor, type: 'button' }, 'Trigger'),
            h(
              GhostPortal,
              { to: 'body', defer: true },
              {
                default: () =>
                  h(
                    'div',
                    {
                      ref: floating,
                      'data-coords': `${String(x.value)},${String(y.value)},${placement.value}`,
                    },
                    'Overlay content',
                  ),
              },
            ),
          ])
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('Trigger')
    expect(html).toContain('Overlay content')
    expect(html).toContain('data-coords="0,0,right"')
  })

  it('renders GhostPopover closed and defaultOpen states cleanly in Node SSR', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const ClosedApp = defineComponent({
      setup() {
        return () =>
          h(GhostPopover, null, {
            default: () => [
              h(GhostPopoverTrigger, null, () => 'Closed trigger'),
              h(GhostPopoverContent, null, () => 'Hidden SSR panel'),
            ],
          })
      },
    })

    const closedHtml = await renderToString(createSSRApp(ClosedApp))
    expect(closedHtml).toContain('Closed trigger')
    expect(closedHtml).toContain('aria-expanded="false"')
    expect(closedHtml).not.toContain('Hidden SSR panel')

    const OpenApp = defineComponent({
      setup() {
        return () =>
          h(
            GhostPopover,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostPopoverTrigger, null, () => 'Open trigger'),
                h(GhostPopoverContent, null, () => [
                  h('p', 'Visible SSR panel'),
                  h(GhostPopoverClose, null, () => 'Dismiss'),
                ]),
              ],
            },
          )
      },
    })

    const openHtml = await renderToString(createSSRApp(OpenApp))
    expect(openHtml).toContain('Open trigger')
    expect(openHtml).toContain('aria-expanded="true"')
    expect(openHtml).toContain('Visible SSR panel')
    expect(openHtml).toContain('role="dialog"')
    expect(openHtml).toContain('visibility:hidden')
  })
})
