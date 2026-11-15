import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostCard,
  type GhostCardExposed,
} from '../../packages/themes/src/index'

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

describe('themed GhostCard', () => {
  it('exposes the inner root and sets data-themed', () => {
    const component = ref<GhostCardExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostCard,
          { ref: component },
          {
            default: () => 'Body',
          },
        ),
    })
    const wrapper = mount(host)
    const root = wrapper.get('[data-ghost-card]')

    expect(root.attributes('data-themed')).toBe('')
    const exposed = component.value
    expect(exposed?.element).toBe(root.element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })

  it('forwards interactive spotlight to the unstyled primitive', () => {
    stubFinePointer()
    const wrapper = mount(GhostCard, {
      props: { interactive: 'spotlight' },
      slots: { default: 'Glow' },
    })

    expect(
      wrapper.get('[data-ghost-card]').attributes('data-interactive'),
    ).toBe('spotlight')
    expect(wrapper.find('[data-part="glow"]').exists()).toBe(true)
    wrapper.unmount()
  })
})
