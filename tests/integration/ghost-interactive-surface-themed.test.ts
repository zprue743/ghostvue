import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GhostInteractiveSurface,
  type GhostInteractiveSurfaceExposed,
} from '../../packages/themes/src/ghost-interactive-surface'

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

describe('themed GhostInteractiveSurface', () => {
  it('renders a div with spotlight hooks and glow layer by default', async () => {
    stubFinePointer()
    const wrapper = mount(GhostInteractiveSurface, {
      attachTo: document.body,
      slots: { default: 'Surface content' },
    })
    await nextTick()

    const root = wrapper.get('[data-part="root"]')
    expect(root.element.tagName).toBe('DIV')
    expect(root.attributes('data-interactive')).toBe('spotlight')
    expect(root.attributes('data-state')).toBe('idle')
    expect(wrapper.get('[data-part="glow"]').attributes('aria-hidden')).toBe(
      'true',
    )
    expect(root.text()).toBe('Surface content')
    wrapper.unmount()
  })

  it('renders the requested root tag and forwards native attributes', async () => {
    stubFinePointer()
    const onClick = vi.fn()
    const wrapper = mount(GhostInteractiveSurface, {
      props: { as: 'article', effects: [] },
      attrs: {
        class: 'card',
        'data-testid': 'themed-surface',
        onClick,
      },
      slots: { default: 'Body' },
    })

    const root = wrapper.get('article')
    await root.trigger('click')

    expect(root.classes()).toContain('card')
    expect(root.attributes('data-testid')).toBe('themed-surface')
    expect(root.attributes('data-state')).toBe('off')
    expect(onClick).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('delegates the exposed element property to the underlying surface', async () => {
    stubFinePointer()
    const wrapper = mount(GhostInteractiveSurface, {
      attachTo: document.body,
      props: { as: 'section' },
      slots: { default: 'Body' },
    })
    await nextTick()

    const exposed = wrapper.vm as unknown as GhostInteractiveSurfaceExposed
    expect(exposed.element).toBe(wrapper.get('section').element)

    wrapper.unmount()
    expect(exposed.element).toBeNull()
  })

  it('renders deterministic off-state markup during SSR', async () => {
    const html = await renderToString(
      h(GhostInteractiveSurface, null, { default: () => 'Report' }),
    )

    expect(html).toContain('data-part="root"')
    expect(html).toContain('data-interactive="spotlight"')
    expect(html).toContain('data-state="off"')
    expect(html).toContain('data-part="glow"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('Report')
  })
})
