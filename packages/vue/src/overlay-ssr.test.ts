/** @vitest-environment node */

import { createSSRApp, defineComponent, h, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostPortal from './GhostPortal.vue'
import { useDismissableLayer } from './use-dismissable-layer'
import { useFloating } from './use-floating'

describe('overlay primitives in Node SSR (no window or document)', () => {
  it('renders all three primitives without window or document globals', async () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')

    const Comp = defineComponent({
      setup() {
        const anchor = ref<HTMLElement | null>(null)
        const floating = ref<HTMLElement | null>(null)

        useDismissableLayer(floating, { onDismiss: () => undefined })
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
})
