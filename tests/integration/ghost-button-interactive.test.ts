import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GhostButton,
  type GhostButtonExposed,
} from '../../packages/themes/src/ghost-button'

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

describe('themed GhostButton interactivity', () => {
  it('omits spotlight markup when the prop is unset', async () => {
    stubFinePointer()
    const wrapper = mount(GhostButton, {
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
    const wrapper = mount(GhostButton, {
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

  it('maps non-default visual props to data attributes and omits defaults', () => {
    stubFinePointer()
    const defaultWrapper = mount(GhostButton, {
      slots: { default: 'Default' },
    })
    const defaultButton = defaultWrapper.get('button')
    expect(defaultButton.attributes('data-variant')).toBeUndefined()
    expect(defaultButton.attributes('data-tone')).toBeUndefined()
    expect(defaultButton.attributes('data-size')).toBeUndefined()
    expect(defaultButton.attributes('data-block')).toBeUndefined()
    expect(defaultButton.attributes('data-icon-only')).toBeUndefined()
    defaultWrapper.unmount()

    const styledWrapper = mount(GhostButton, {
      props: {
        variant: 'outline',
        tone: 'danger',
        size: 'lg',
        block: true,
        iconOnly: true,
      },
      attrs: { 'aria-label': 'Delete' },
      slots: { default: 'X' },
    })
    const styledButton = styledWrapper.get('button')
    expect(styledButton.attributes('data-variant')).toBe('outline')
    expect(styledButton.attributes('data-tone')).toBe('danger')
    expect(styledButton.attributes('data-size')).toBe('lg')
    expect(styledButton.attributes('data-block')).toBe('')
    expect(styledButton.attributes('data-icon-only')).toBe('')
    styledWrapper.unmount()
  })

  it('delegates exposed element, focus, and blur to the native button', () => {
    stubFinePointer()
    const wrapper = mount(GhostButton, {
      attachTo: document.body,
      slots: { default: 'Save' },
    })
    const button = wrapper.get('button')
    const focusSpy = vi.spyOn(button.element, 'focus')
    const blurSpy = vi.spyOn(button.element, 'blur')
    const exposed = wrapper.vm as unknown as GhostButtonExposed

    expect(exposed.element).toBe(button.element)

    exposed.focus({ preventScroll: true })
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true })
    expect(document.activeElement).toBe(button.element)

    exposed.blur()
    expect(blurSpy).toHaveBeenCalledOnce()
    expect(document.activeElement).not.toBe(button.element)

    wrapper.unmount()
    expect(exposed.element).toBeNull()
  })
})
