/** @vitest-environment node */

import { describe, expect, it, vi } from 'vitest'
import { type Component, createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

import { defineDemoPreview } from '../../apps/docs/.vitepress/theme/demo-preview-async'
import DemoPreview from '../../apps/docs/.vitepress/theme/DemoPreview.vue'

/*
 * `vitepress build` server-renders every page, so the static HTML must already
 * hold the live demo (never an empty canvas or a loading placeholder) and the
 * collapsed source.
 */
const Demo = defineComponent({
  setup: () => () => h('button', { class: 'demo-root' }, 'Live demo'),
})

/**
 * A dynamic `import()` resolves to a namespace object; Vue only unwraps
 * `default` from objects that look like one, so fake loaders must too.
 */
function esModule(component: Component): { default: Component } {
  const namespace = { __esModule: true, default: component }
  return namespace
}

describe('DemoPreview server rendering', () => {
  it('renders the resolved demo and the collapsed, highlighted source', async () => {
    const Preview = defineDemoPreview(() => Promise.resolve(esModule(Demo)))
    const app = createSSRApp({
      render: () =>
        h(
          DemoPreview,
          { title: 'Themed', layer: 'themed' },
          {
            default: () => h(Preview),
            source: () => h('pre', { class: 'probe-source' }, 'source'),
          },
        ),
    })
    const html = await renderToString(app)

    expect(html).toContain('Live demo')
    expect(html).not.toContain('Loading example')
    expect(html).toContain('aria-expanded="false"')
    // The source markup ships in SSR, hidden until the disclosure opens.
    expect(html).toMatch(
      /data-testid="ghost-example-source"[^>]*style="display:none;?"/,
    )
    expect(html).toContain('class="probe-source"')
  })

  it('renders an explained failure state when the demo chunk rejects', async () => {
    const Preview = defineDemoPreview(() =>
      Promise.reject(new Error('chunk 404')),
    )
    const app = createSSRApp({
      render: () =>
        h(DemoPreview, { title: 'Themed' }, { default: () => h(Preview) }),
    })
    // The async loader reports the rejection; this test asserts the fallback.
    app.config.errorHandler = vi.fn()
    const html = await renderToString(app)

    expect(html).toContain('role="status"')
    expect(html).toContain('data-state="error"')
    expect(html).toContain('This example could not load')
    expect(html).toContain('Reload page')
  })
})
