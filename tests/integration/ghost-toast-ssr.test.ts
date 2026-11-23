import { createSSRApp, defineComponent, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import GhostToastProvider from '../../packages/vue/src/GhostToastProvider.vue'
import GhostToastViewport from '../../packages/vue/src/GhostToastViewport.vue'
import { useGhostToast } from '../../packages/vue/src/use-ghost-toast'
import { expectSsrHydration } from '../support/ssr-hydration'

let warn: MockInstance<typeof console.warn>

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

function warnedCodes(): string[] {
  return warn.mock.calls.map((call: unknown[]) => {
    const match = /\[ghostvue (GHOST\d{3})\]/.exec(String(call[0]))
    return match?.[1] ?? String(call[0])
  })
}

describe('server rendering (T1)', () => {
  function ssrRoot(callToast: boolean) {
    const Caller = defineComponent({
      setup() {
        const { toast } = useGhostToast()
        if (callToast) {
          toast({ title: 'From setup' })
        }
        return () => null
      },
    })
    return defineComponent({
      setup: () => () =>
        h(GhostToastProvider, null, () => [
          h(Caller),
          h(GhostToastViewport, { portal: false }),
        ]),
    })
  }

  it('renders the empty region and both announcers deterministically', async () => {
    const { html } = await expectSsrHydration(ssrRoot(false), {
      assertServerHtml(markup) {
        expect(markup).toContain('role="region"')
        expect(markup).toContain('data-ghost-live')
        expect(markup).toContain('data-part="announcer-polite"')
        expect(markup).toContain('data-part="announcer-assertive"')
        expect(markup).not.toContain('data-ghost-toast')
      },
    })
    expect(html).toContain('aria-label="Notifications"')
  })

  it('ignores toast() during SSR with a development warning', async () => {
    const html = await renderToString(createSSRApp(ssrRoot(true)))
    expect(html).not.toContain('From setup')
    expect(html).not.toContain('data-ghost-toast')
    expect(warnedCodes()).toEqual(['GHOST006'])
  })

  it('shows a toast created during hydration after the viewport mounts', async () => {
    const root = ssrRoot(true)
    const html = await renderToString(createSSRApp(root))
    warn.mockClear()
    const container = document.createElement('div')
    container.innerHTML = html
    document.body.append(container)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const app = createSSRApp(root)
    app.mount(container)
    await nextTick()
    expect(container.querySelectorAll('[data-ghost-toast]')).toHaveLength(1)
    expect(warn).not.toHaveBeenCalled()
    expect(error).not.toHaveBeenCalled()
    app.unmount()
  })
})
