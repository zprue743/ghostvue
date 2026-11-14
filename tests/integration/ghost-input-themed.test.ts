import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostInput } from '../../packages/themes/src/ghost-input'

describe('themed GhostInput', () => {
  it('scopes recipe CSS and forwards behavioral props', () => {
    const wrapper = mount(GhostInput, {
      props: {
        invalid: true,
        size: 'sm',
        block: true,
        type: 'search',
      },
    })
    const scope = wrapper.get('span')
    const root = wrapper.get('input')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(root.classes()).toContain('ghost-input')
    expect(root.element.type).toBe('search')
    expect(root.attributes('aria-invalid')).toBe('true')
    expect(root.attributes('data-state')).toBe('invalid')
    expect(root.attributes('data-size')).toBe('sm')
    expect(root.attributes()).toHaveProperty('data-block')
  })

  it('omits default size so CSS can treat a missing hook as md', () => {
    const wrapper = mount(GhostInput)
    const root = wrapper.get('input')

    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.attributes('data-block')).toBeUndefined()
  })
})
