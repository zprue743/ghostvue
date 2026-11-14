import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostSpinner } from '../../packages/themes/src/ghost-spinner'

describe('themed GhostSpinner', () => {
  it('scopes styles and omits default tone and size hooks', () => {
    const wrapper = mount(GhostSpinner)
    const root = wrapper.get('.ghost-spinner')

    expect(wrapper.get('.ghost-themed-scope').element.tagName).toBe('SPAN')
    expect(root.attributes('role')).toBe('status')
    expect(root.attributes('data-tone')).toBeUndefined()
    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.text()).toBe('Loading')
  })

  it('forwards visual props as data attributes and keeps the label', () => {
    const wrapper = mount(GhostSpinner, {
      props: {
        label: 'Refreshing reports',
        size: 'sm',
        tone: 'danger',
      },
      attrs: { class: 'dense' },
    })
    const root = wrapper.get('.ghost-spinner')

    expect(root.attributes('data-size')).toBe('sm')
    expect(root.attributes('data-tone')).toBe('danger')
    expect(root.classes()).toContain('dense')
    expect(root.text()).toBe('Refreshing reports')
  })
})
