import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SlButton } from '../../packages/themes/src/sl-button'

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

describe('themed SlButton interactivity', () => {
  it('omits spotlight markup when the prop is unset', async () => {
    stubFinePointer()
    const wrapper = mount(SlButton, {
      attachTo: document.body,
      slots: { default: 'Save' },
    })
    await nextTick()

    const button = wrapper.get('button')
    expect(button.attributes('data-interactive')).toBeUndefined()
    expect(button.attributes('data-interactive-state')).toBeUndefined()
    expect(wrapper.find('[data-part="glow"]').exists()).toBe(false)
    expect(button.text()).toBe('Save')
    wrapper.unmount()
  })

  it('opts into spotlight without overwriting loading data-state', async () => {
    stubFinePointer()
    const wrapper = mount(SlButton, {
      attachTo: document.body,
      props: { interactive: 'spotlight', loading: true },
      slots: { default: 'Save' },
    })
    await nextTick()

    const button = wrapper.get('button')
    expect(button.attributes('data-interactive')).toBe('spotlight')
    expect(button.attributes('data-interactive-state')).toBe('idle')
    expect(button.attributes('data-state')).toBe('loading')
    expect(wrapper.get('[data-part="glow"]').attributes('aria-hidden')).toBe(
      'true',
    )
    wrapper.unmount()
  })
})
