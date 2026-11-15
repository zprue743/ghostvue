import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import {
  GhostAvatar,
  type GhostAvatarExposed,
} from '../../packages/themes/src/ghost-avatar'

describe('themed GhostAvatar', () => {
  it('omits default size hook so CSS can treat missing as md', () => {
    const wrapper = mount(GhostAvatar, { props: { name: 'Jane Doe' } })
    const root = wrapper.get('.ghost-avatar')

    expect(wrapper.get('.ghost-themed-scope').classes()).toContain(
      'ghost-themed-scope',
    )
    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.text()).toBe('JD')
    wrapper.unmount()
  })

  it('sets data-size only for non-default values', () => {
    const wrapper = mount(GhostAvatar, {
      props: { name: 'Jane Doe', size: 'lg' },
    })

    expect(wrapper.get('.ghost-avatar').attributes('data-size')).toBe('lg')
    wrapper.unmount()
  })

  it('forwards attrs and exposes the root element', () => {
    const wrapper = mount(GhostAvatar, {
      attrs: { id: 'profile-avatar', title: 'Profile' },
      props: { name: 'Jane Doe' },
    })

    const root = wrapper.get('.ghost-avatar')
    expect(root.attributes('id')).toBe('profile-avatar')
    const exposed = wrapper.vm as unknown as GhostAvatarExposed
    expect(exposed.element).toBe(root.element)
    wrapper.unmount()
  })
})
