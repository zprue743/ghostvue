import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import SlInteractiveSurface from './SlInteractiveSurface.vue'
import type { SlInteractiveSurfaceExposed } from './sl-interactive-surface'

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

describe('SlInteractiveSurface', () => {
  it('renders a glow layer and default spotlight hooks', () => {
    stubFinePointer()
    const wrapper = mount(SlInteractiveSurface, {
      slots: { default: 'Report' },
    })

    expect(wrapper.get('div').element.tagName).toBe('DIV')
    expect(wrapper.attributes('data-part')).toBe('root')
    expect(wrapper.attributes('data-interactive')).toBe('spotlight')
    expect(wrapper.get('[data-part="glow"]').attributes('aria-hidden')).toBe(
      'true',
    )
    expect(wrapper.text()).toBe('Report')
    wrapper.unmount()
  })

  it('renders the requested root tag and forwards attributes', () => {
    stubFinePointer()
    const wrapper = mount(SlInteractiveSurface, {
      props: { as: 'article' },
      attrs: { class: 'card', 'data-testid': 'surface' },
      slots: { default: 'Body' },
    })

    expect(wrapper.get('article').element.tagName).toBe('ARTICLE')
    expect(wrapper.classes()).toContain('card')
    expect(wrapper.attributes('data-testid')).toBe('surface')
    wrapper.unmount()
  })

  it('exposes the root element after mount', () => {
    stubFinePointer()
    const wrapper = mount(SlInteractiveSurface, {
      attachTo: document.body,
      slots: { default: 'Body' },
    })
    const exposed = wrapper.vm as unknown as SlInteractiveSurfaceExposed

    expect(exposed.element).toBe(wrapper.element)
    wrapper.unmount()
  })

  it('renders deterministic off-state markup during SSR', async () => {
    const html = await renderToString(
      h(SlInteractiveSurface, null, { default: () => 'Report' }),
    )

    expect(html).toContain('data-part="root"')
    expect(html).toContain('data-interactive="spotlight"')
    expect(html).toContain('data-state="off"')
    expect(html).toContain('data-part="glow"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('Report')
  })
})
