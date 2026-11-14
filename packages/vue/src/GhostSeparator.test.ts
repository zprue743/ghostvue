import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostSeparator from './GhostSeparator.vue'
import type { GhostSeparatorElement } from './ghost-separator'

describe('GhostSeparator', () => {
  it('renders a native horizontal thematic break by default', () => {
    const wrapper = mount(GhostSeparator)
    const root = wrapper.get('hr').element

    expect(root.tagName).toBe('HR')
    expect(root.getAttribute('role')).toBeNull()
    expect(root.getAttribute('aria-orientation')).toBeNull()
    expect(wrapper.get('hr').classes()).toContain('ghost-separator')
    expect(root.getAttribute('data-part')).toBe('root')
    expect(root.getAttribute('data-orientation')).toBe('horizontal')
  })

  it('exposes vertical separators to assistive technology', () => {
    const wrapper = mount(GhostSeparator, {
      props: { orientation: 'vertical' },
    })
    const root = wrapper.get('div').element

    expect(root.tagName).toBe('DIV')
    expect(root.getAttribute('role')).toBe('separator')
    expect(root.getAttribute('aria-orientation')).toBe('vertical')
    expect(root.getAttribute('data-orientation')).toBe('vertical')
  })

  it('keeps decorative separators out of the accessibility tree', () => {
    const wrapper = mount(GhostSeparator, {
      props: { decorative: true },
    })
    const root = wrapper.get('hr').element

    expect(root.getAttribute('role')).toBe('none')
    expect(root.getAttribute('aria-orientation')).toBeNull()
  })

  it('sets separator role on a vertical hr so native horizontal semantics do not win', () => {
    const wrapper = mount(GhostSeparator, {
      props: { as: 'hr', orientation: 'vertical' },
    })
    const root = wrapper.get('hr').element

    expect(root.getAttribute('role')).toBe('separator')
    expect(root.getAttribute('aria-orientation')).toBe('vertical')
  })

  it.each<GhostSeparatorElement>(['hr', 'div', 'li'])(
    'renders %s as its only root element',
    (as) => {
      const wrapper = mount(GhostSeparator, { props: { as } })
      const root = wrapper.get(as).element

      expect(root.tagName).toBe(as.toUpperCase())
      expect(root.childNodes).toHaveLength(0)
    },
  )

  it('forwards class and native attributes to the root', () => {
    const wrapper = mount(GhostSeparator, {
      attrs: {
        'aria-label': 'Section break',
        class: 'toolbar-rule',
        id: 'after-filters',
      },
    })
    const root = wrapper.get('hr')

    expect(root.attributes('aria-label')).toBe('Section break')
    expect(root.attributes('id')).toBe('after-filters')
    expect(root.classes()).toContain('ghost-separator')
    expect(root.classes()).toContain('toolbar-rule')
  })

  it('renders deterministic markup during SSR', async () => {
    const html = await renderToString(
      h(GhostSeparator, { orientation: 'vertical', decorative: true }),
    )

    expect(html).toContain('class="ghost-separator"')
    expect(html).toContain('data-part="root"')
    expect(html).toContain('data-orientation="vertical"')
    expect(html).toContain('role="none"')
    expect(html).not.toContain('aria-orientation')
  })
})
