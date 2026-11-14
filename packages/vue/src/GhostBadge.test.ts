import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostBadge from './GhostBadge.vue'
import type { GhostBadgeExposed } from './ghost-badge'

describe('GhostBadge', () => {
  it('renders native span semantics without a role or data-state', () => {
    const wrapper = mount(GhostBadge, { slots: { default: 'Active' } })
    const root = wrapper.get('span')

    expect(root.classes()).toContain('ghost-badge')
    expect(root.attributes('data-part')).toBe('root')
    expect(root.attributes('role')).toBeUndefined()
    expect(root.attributes('data-state')).toBeUndefined()
    expect(root.attributes('aria-hidden')).toBeUndefined()
    expect(root.text()).toBe('Active')
  })

  it('forwards native attributes and listeners to the span', () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostBadge, {
      attrs: {
        'aria-label': '12 unread',
        class: 'meta',
        id: 'row-status',
        lang: 'en',
        onClick,
        title: 'Open',
      },
      slots: { default: '12' },
    })

    const root = wrapper.get('span')
    root.element.click()

    expect(root.attributes('aria-label')).toBe('12 unread')
    expect(root.attributes('id')).toBe('row-status')
    expect(root.attributes('lang')).toBe('en')
    expect(root.attributes('title')).toBe('Open')
    expect(root.classes()).toContain('ghost-badge')
    expect(root.classes()).toContain('meta')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('keeps slot text in document order for assistive technology', () => {
    const wrapper = mount({
      setup() {
        return () =>
          h('p', ['Status ', h(GhostBadge, null, () => 'Draft'), ' saved'])
      },
    })

    expect(wrapper.text()).toBe('Status Draft saved')
  })

  it('supports decorative icons marked as a styling part', () => {
    const wrapper = mount(GhostBadge, {
      slots: {
        default:
          '<span data-part="icon"><svg aria-hidden="true"></svg></span>Active',
      },
    })

    const icon = wrapper.get('[data-part="icon"]')
    expect(icon.element.tagName).toBe('SPAN')
    expect(wrapper.get('svg').attributes('aria-hidden')).toBe('true')
    expect(wrapper.text()).toContain('Active')
  })

  it('names an icon with hidden text rather than aria-label on the span', () => {
    const wrapper = mount(GhostBadge, {
      slots: {
        default:
          '<svg data-part="icon" aria-hidden="true"></svg><span data-state="hidden">New</span>',
      },
    })

    expect(
      wrapper.get('span.ghost-badge').attributes('aria-label'),
    ).toBeUndefined()
    expect(wrapper.get('span.ghost-badge').attributes('role')).toBeUndefined()
    expect(wrapper.get('[data-part="icon"]').attributes('aria-hidden')).toBe(
      'true',
    )
    expect(wrapper.text()).toContain('New')
  })

  it('exposes the native element after mount and null after unmount', () => {
    const wrapper = mount(GhostBadge, {
      attachTo: document.body,
      slots: { default: 'Active' },
    })
    const exposed = wrapper.vm as unknown as GhostBadgeExposed

    expect(exposed.element).toBe(wrapper.get('span').element)
    wrapper.unmount()
    expect(exposed.element).toBeNull()
  })

  it('renders deterministic native markup during SSR', async () => {
    const html = await renderToString(h(GhostBadge, null, () => 'Active'))

    expect(html).toContain('class="ghost-badge"')
    expect(html).toContain('data-part="root"')
    expect(html).toContain('Active')
    expect(html).not.toContain('role=')
    expect(html).not.toContain('data-state')
  })
})
