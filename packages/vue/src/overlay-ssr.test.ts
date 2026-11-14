/** @vitest-environment node */

import { createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostDialog from './GhostDialog.vue'
import GhostDialogClose from './GhostDialogClose.vue'
import GhostDialogContent from './GhostDialogContent.vue'
import GhostDialogDescription from './GhostDialogDescription.vue'
import GhostDialogOverlay from './GhostDialogOverlay.vue'
import GhostDialogTitle from './GhostDialogTitle.vue'
import GhostDialogTrigger from './GhostDialogTrigger.vue'
import GhostCollapsible from './GhostCollapsible.vue'
import GhostCollapsibleContent from './GhostCollapsibleContent.vue'
import GhostCollapsibleTrigger from './GhostCollapsibleTrigger.vue'
import GhostPopover from './GhostPopover.vue'
import GhostPopoverClose from './GhostPopoverClose.vue'
import GhostPopoverContent from './GhostPopoverContent.vue'
import GhostPopoverTrigger from './GhostPopoverTrigger.vue'
import GhostTooltip from './GhostTooltip.vue'
import GhostTooltipContent from './GhostTooltipContent.vue'
import GhostTooltipTrigger from './GhostTooltipTrigger.vue'
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

  it('renders GhostTooltip closed and defaultOpen states cleanly in Node SSR', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const ClosedApp = defineComponent({
      setup() {
        return () =>
          h(GhostTooltip, null, {
            default: () => [
              h(GhostTooltipTrigger, null, () => 'Closed trigger'),
              h(GhostTooltipContent, null, () => 'Hidden SSR hint'),
            ],
          })
      },
    })

    const closedHtml = await renderToString(createSSRApp(ClosedApp))
    expect(closedHtml).toContain('Closed trigger')
    expect(closedHtml).not.toContain('aria-describedby')
    expect(closedHtml).not.toContain('Hidden SSR hint')

    const OpenApp = defineComponent({
      setup() {
        return () =>
          h(
            GhostTooltip,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostTooltipTrigger, null, () => 'Open trigger'),
                h(GhostTooltipContent, null, () => 'Visible SSR hint'),
              ],
            },
          )
      },
    })

    const openHtml = await renderToString(createSSRApp(OpenApp))
    expect(openHtml).toContain('Open trigger')
    expect(openHtml).toContain('aria-describedby')
    expect(openHtml).toContain('Visible SSR hint')
    expect(openHtml).toContain('role="tooltip"')
    expect(openHtml).toContain('visibility:hidden')
  })

  it('renders GhostDialog closed and defaultOpen states cleanly in Node SSR', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const ClosedApp = defineComponent({
      setup() {
        return () =>
          h(GhostDialog, null, {
            default: () => [
              h(GhostDialogTrigger, null, () => 'Closed dialog trigger'),
              h(GhostDialogOverlay),
              h(GhostDialogContent, null, () => [
                h(GhostDialogTitle, null, () => 'Hidden SSR title'),
                h(GhostDialogDescription, null, () => 'Hidden SSR description'),
                h(GhostDialogClose, null, () => 'Dismiss'),
              ]),
            ],
          })
      },
    })

    const closedHtml = await renderToString(createSSRApp(ClosedApp))
    expect(closedHtml).toContain('Closed dialog trigger')
    expect(closedHtml).toContain('aria-expanded="false"')
    expect(closedHtml).not.toContain('Hidden SSR title')
    expect(closedHtml).not.toContain('Hidden SSR description')

    const OpenApp = defineComponent({
      setup() {
        return () =>
          h(
            GhostDialog,
            { defaultOpen: true },
            {
              default: () => [
                h(GhostDialogTrigger, null, () => 'Open dialog trigger'),
                h(GhostDialogOverlay, { portal: false }),
                h(GhostDialogContent, { portal: false }, () => [
                  h(GhostDialogTitle, null, () => 'Visible SSR title'),
                  h(
                    GhostDialogDescription,
                    null,
                    () => 'Visible SSR description',
                  ),
                  h(GhostDialogClose, null, () => 'Close'),
                ]),
              ],
            },
          )
      },
    })

    const openHtml = await renderToString(createSSRApp(OpenApp))
    expect(openHtml).toContain('Open dialog trigger')
    expect(openHtml).toContain('aria-expanded="true"')
    expect(openHtml).toContain('Visible SSR title')
    expect(openHtml).toContain('Visible SSR description')
    expect(openHtml).toContain('role="dialog"')
    expect(openHtml).toContain('aria-modal="true"')
    expect(openHtml).toContain('data-part="overlay"')
  })

  it('renders GhostCollapsible closed and defaultOpen states cleanly in Node SSR', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const ClosedApp = defineComponent({
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

    const closedHtml = await renderToString(createSSRApp(ClosedApp))
    expect(closedHtml).toContain('Closed disclosure')
    expect(closedHtml).toContain('aria-expanded="false"')
    expect(closedHtml).toContain('Hidden SSR disclosure')
    expect(closedHtml).toContain('hidden')

    const OpenApp = defineComponent({
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

    const openHtml = await renderToString(createSSRApp(OpenApp))
    expect(openHtml).toContain('Open disclosure')
    expect(openHtml).toContain('aria-expanded="true"')
    expect(openHtml).toContain('Visible SSR disclosure')
    expect(openHtml).not.toContain(' hidden')
  })
})
