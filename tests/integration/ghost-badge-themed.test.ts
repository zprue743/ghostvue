import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import {
  GhostBadge,
  type GhostBadgeExposed,
} from '../../packages/themes/src/ghost-badge'

describe('themed GhostBadge', () => {
  it('omits default visual hooks so CSS can treat missing as soft/neutral/sm', () => {
    const wrapper = mount(GhostBadge, { slots: { default: 'Active' } })
    const root = wrapper.get('.ghost-badge')

    expect(wrapper.get('.ghost-themed-scope').classes()).toContain(
      'ghost-themed-scope',
    )
    expect(root.attributes('data-variant')).toBeUndefined()
    expect(root.attributes('data-tone')).toBeUndefined()
    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.text()).toBe('Active')
    wrapper.unmount()
  })

  it('sets data-* hooks only for non-default visual props', () => {
    const wrapper = mount(GhostBadge, {
      props: { variant: 'solid', tone: 'danger', size: 'md' },
      slots: { default: 'Overdue' },
    })
    const root = wrapper.get('.ghost-badge')

    expect(root.attributes('data-variant')).toBe('solid')
    expect(root.attributes('data-tone')).toBe('danger')
    expect(root.attributes('data-size')).toBe('md')
    wrapper.unmount()
  })

  it('forwards attrs onto the unstyled span and exposes that element', () => {
    const wrapper = mount(GhostBadge, {
      attrs: { class: 'meta', id: 'row-status', 'aria-label': '12 unread' },
      slots: { default: '12' },
    })
    const exposed = wrapper.vm as unknown as GhostBadgeExposed
    const root = wrapper.get('.ghost-badge')

    expect(root.classes()).toContain('meta')
    expect(root.attributes('id')).toBe('row-status')
    expect(root.attributes('aria-label')).toBe('12 unread')
    expect(exposed.element).toBe(root.element)

    wrapper.unmount()
    expect(exposed.element).toBeNull()
  })
})
