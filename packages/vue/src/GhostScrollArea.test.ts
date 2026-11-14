import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostScrollArea from './GhostScrollArea.vue'

function stubScrollMetrics(
  element: HTMLElement,
  metrics: {
    clientHeight: number
    clientWidth: number
    scrollHeight: number
    scrollWidth: number
  },
): void {
  Object.defineProperties(element, {
    clientHeight: { configurable: true, get: () => metrics.clientHeight },
    clientWidth: { configurable: true, get: () => metrics.clientWidth },
    scrollHeight: { configurable: true, get: () => metrics.scrollHeight },
    scrollWidth: { configurable: true, get: () => metrics.scrollWidth },
  })
}

describe('GhostScrollArea', () => {
  it('renders stable styling hooks and vertical overflow styles by default', () => {
    const wrapper = mount(GhostScrollArea, {
      slots: { default: () => 'Content' },
    })
    const root = wrapper.get('div')

    expect(root.classes()).toContain('ghost-scroll-area')
    expect(root.attributes('data-part')).toBe('root')
    expect(root.attributes('data-orientation')).toBe('vertical')
    expect(root.attributes('data-overflow')).toBe('none')
    expect(root.attributes('style')).toContain('overflow-y: auto')
    expect(root.attributes('style')).toContain('overflow-x: hidden')
    expect(root.attributes('tabindex')).toBeUndefined()
  })

  it('uses scroll overflow type on enabled axes', () => {
    const wrapper = mount(GhostScrollArea, {
      props: { type: 'scroll', orientation: 'both' },
    })

    const style = wrapper.get('div').attributes('style') ?? ''
    expect(style).toContain('overflow-y: scroll')
    expect(style).toContain('overflow-x: scroll')
  })

  it('adds tabindex and label when overflowing with no tab stops', async () => {
    const wrapper = mount(GhostScrollArea, {
      props: { label: 'Messages' },
      slots: { default: () => h('p', 'Long content') },
      attachTo: document.body,
    })

    const root = wrapper.get('div')
    stubScrollMetrics(root.element, {
      clientHeight: 80,
      clientWidth: 200,
      scrollHeight: 240,
      scrollWidth: 200,
    })
    root.element.append(document.createElement('p'))

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
    })

    expect(root.attributes('data-overflow')).toBe('vertical')
    expect(root.attributes('tabindex')).toBe('0')
    expect(root.attributes('aria-label')).toBe('Messages')
  })

  it('keeps the root out of the tab order when tabbable children exist', async () => {
    const wrapper = mount(GhostScrollArea, {
      props: { label: 'List' },
      slots: {
        default: () => h('button', { type: 'button' }, 'Action'),
      },
      attachTo: document.body,
    })

    const root = wrapper.get('div')
    stubScrollMetrics(root.element, {
      clientHeight: 80,
      clientWidth: 200,
      scrollHeight: 240,
      scrollWidth: 200,
    })
    root.element.append(document.createElement('p'))

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
    })

    expect(root.attributes('tabindex')).toBeUndefined()
  })

  it('scrolls vertically on arrow keys when focused', async () => {
    const wrapper = mount(GhostScrollArea, {
      props: { label: 'Scroll region' },
      slots: { default: () => h('p', 'x'.repeat(4000)) },
      attachTo: document.body,
    })
    const root = wrapper.get('div').element

    stubScrollMetrics(root, {
      clientHeight: 80,
      clientWidth: 200,
      scrollHeight: 400,
      scrollWidth: 200,
    })

    const scrollBy = vi.fn()
    root.scrollTo = vi.fn()
    root.scrollBy = scrollBy

    root.append(document.createElement('p'))

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          resolve()
        })
      })
    })

    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    )

    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ top: 40 }))
  })

  it('forwards native attributes to the root', () => {
    const wrapper = mount(GhostScrollArea, {
      attrs: {
        class: 'panel-scroll',
        id: 'log-scroll',
        'data-testid': 'scroll-root',
      },
    })

    const root = wrapper.get('div')
    expect(root.attributes('id')).toBe('log-scroll')
    expect(root.attributes('data-testid')).toBe('scroll-root')
    expect(root.classes()).toContain('panel-scroll')
    expect(root.classes()).toContain('ghost-scroll-area')
  })

  it('renders deterministic SSR markup without client-only tabindex', async () => {
    const html = await renderToString(
      h(
        GhostScrollArea,
        { label: 'Items' },
        { default: () => h('p', 'Static') },
      ),
    )

    expect(html).toContain('ghost-scroll-area')
    expect(html).toContain('data-part="root"')
    expect(html).toContain('data-orientation="vertical"')
    expect(html).toContain('data-overflow="none"')
    expect(html).not.toContain('tabindex')
  })
})
