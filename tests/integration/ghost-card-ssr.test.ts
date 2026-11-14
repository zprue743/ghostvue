import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import GhostCard from '../../packages/vue/src/GhostCard.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFinePointer() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    media: query,
  }))
  class IdleObserver {
    observe(target: Element): void {
      void target
    }
    disconnect(): void {
      return undefined
    }
  }
  vi.stubGlobal('IntersectionObserver', IdleObserver)
  vi.stubGlobal('ResizeObserver', IdleObserver)
}

describe('GhostCard SSR hydration', () => {
  it('hydrates spotlight cards without id or markup drift', async () => {
    stubFinePointer()
    const Root = defineComponent({
      render: () =>
        h(
          GhostCard,
          { effects: ['spotlight'] },
          {
            header: () => 'Title',
            default: () => 'Body',
          },
        ),
    })

    const { html } = await expectSsrHydration(Root, {
      assertServerHtml: (serverHtml) => {
        expect(serverHtml).toContain('data-ghost-card')
        expect(serverHtml).toContain('data-interactive-state="off"')
      },
    })

    expect(html).toContain('data-part="header"')
  })
})
