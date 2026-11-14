import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostKbd } from '../../packages/themes/src/ghost-kbd'

describe('themed GhostKbd', () => {
  it('scopes styles and omits data-size for the md default', () => {
    const wrapper = mount(GhostKbd, {
      props: { keys: ['mod', 'k'], platform: 'pc' },
    })

    expect(wrapper.find('.ghost-themed-scope').exists()).toBe(true)
    const root = wrapper.get('kbd')
    expect(root.classes()).toContain('ghost-kbd')
    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.attributes('data-platform')).toBe('pc')
    expect(root.text()).toBe('Ctrl+K')
  })

  it('sets data-size for non-default sizes and forwards the slot', () => {
    const wrapper = mount(GhostKbd, {
      props: { size: 'sm' },
      slots: { default: 'Esc' },
    })

    expect(wrapper.get('kbd').attributes('data-size')).toBe('sm')
    expect(wrapper.get('kbd').text()).toBe('Esc')
  })
})
