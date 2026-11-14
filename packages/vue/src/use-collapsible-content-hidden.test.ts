import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'

import GhostCollapsible from './GhostCollapsible.vue'
import GhostCollapsibleContent from './GhostCollapsibleContent.vue'
import GhostCollapsibleTrigger from './GhostCollapsibleTrigger.vue'
import {
  COLLAPSIBLE_HEIGHT_TRANSITION_PROPERTY,
  collapsibleHeightAnimationEnabled,
  isThemedCollapsibleSurface,
} from './use-collapsible-content-hidden'

describe('collapsibleHeightAnimationEnabled', () => {
  it('requires a themed surface and allows motion', () => {
    expect(
      collapsibleHeightAnimationEnabled({
        themedSurface: true,
        disableAnimation: false,
        dataAnimationOff: false,
        prefersReducedMotion: false,
      }),
    ).toBe(true)
    expect(
      collapsibleHeightAnimationEnabled({
        themedSurface: false,
        disableAnimation: false,
        dataAnimationOff: false,
        prefersReducedMotion: false,
      }),
    ).toBe(false)
    expect(
      collapsibleHeightAnimationEnabled({
        themedSurface: true,
        disableAnimation: true,
        dataAnimationOff: false,
        prefersReducedMotion: false,
      }),
    ).toBe(false)
    expect(
      collapsibleHeightAnimationEnabled({
        themedSurface: true,
        disableAnimation: false,
        dataAnimationOff: true,
        prefersReducedMotion: false,
      }),
    ).toBe(false)
    expect(
      collapsibleHeightAnimationEnabled({
        themedSurface: true,
        disableAnimation: false,
        dataAnimationOff: false,
        prefersReducedMotion: true,
      }),
    ).toBe(false)
  })
})

describe('isThemedCollapsibleSurface', () => {
  it('detects data-themed and ghost-theme ancestors', () => {
    const host = document.createElement('div')
    host.className = 'ghost-theme'
    const panel = document.createElement('div')
    host.append(panel)
    document.body.append(host)

    expect(isThemedCollapsibleSurface(panel, false)).toBe(true)
    expect(
      isThemedCollapsibleSurface(document.createElement('div'), true),
    ).toBe(true)
    expect(
      isThemedCollapsibleSurface(document.createElement('div'), false),
    ).toBe(false)

    host.remove()
  })
})

describe('useCollapsibleContentHidden integration', () => {
  const matchMedia = vi.fn()

  beforeEach(() => {
    matchMedia.mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal('matchMedia', matchMedia)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mountThemed(defaultOpen = true) {
    return mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCollapsible,
              { defaultOpen },
              {
                default: () => [
                  h(GhostCollapsibleTrigger, null, () => 'Toggle'),
                  h(
                    GhostCollapsibleContent,
                    { 'data-themed': '' },
                    () => 'Animated panel',
                  ),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )
  }

  it('defers hidden on themed close until grid transition ends', async () => {
    matchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const wrapper = mountThemed(true)
    const trigger = wrapper.get('[data-part="trigger"]')
    const content = wrapper.get('[data-part="content"]').element

    await trigger.trigger('click')
    await flushPromises()

    expect(content.hasAttribute('hidden')).toBe(false)
    expect(content.getAttribute('data-state')).toBe('closed')

    content.dispatchEvent(
      new TransitionEvent('transitionend', {
        propertyName: COLLAPSIBLE_HEIGHT_TRANSITION_PROPERTY,
        bubbles: true,
      }),
    )
    await flushPromises()

    expect(content.hasAttribute('hidden')).toBe(true)

    wrapper.unmount()
  })

  it('sets hidden immediately when disableAnimation is true', async () => {
    matchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCollapsible,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostCollapsibleTrigger, null, () => 'Toggle'),
                  h(
                    GhostCollapsibleContent,
                    { 'data-themed': '', disableAnimation: true },
                    () => 'Static panel',
                  ),
                ],
              },
            )
        },
      }),
      { attachTo: document.body },
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-part="content"]').attributes('hidden')).toBe('')
    wrapper.unmount()
  })

  it('sets hidden immediately under prefers-reduced-motion', async () => {
    matchMedia.mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const wrapper = mountThemed(true)
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-part="content"]').attributes('hidden')).toBe('')
    wrapper.unmount()
  })
})
