import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostSwitch } from '../../packages/themes/src/ghost-switch'

describe('themed GhostSwitch', () => {
  it('scopes recipe CSS and forwards visual props as data attributes', async () => {
    const wrapper = mount(GhostSwitch, {
      attrs: { 'aria-label': 'Airplane mode' },
      props: { size: 'sm', tone: 'danger', defaultValue: true },
    })
    const scope = wrapper.get('span')
    const root = wrapper.get('button')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(root.classes()).toContain('ghost-switch')
    expect(root.attributes('role')).toBe('switch')
    expect(root.attributes('aria-checked')).toBe('true')
    expect(root.attributes('data-size')).toBe('sm')
    expect(root.attributes('data-tone')).toBe('danger')

    await wrapper.get('button').trigger('click')
    expect(root.attributes('aria-checked')).toBe('false')
  })

  it('omits default size and tone data attributes', () => {
    const wrapper = mount(GhostSwitch, {
      attrs: { 'aria-label': 'Airplane mode' },
    })
    const root = wrapper.get('button')

    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.attributes('data-tone')).toBeUndefined()
  })
})
