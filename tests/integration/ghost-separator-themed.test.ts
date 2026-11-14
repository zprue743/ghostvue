import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostSeparator } from '../../packages/themes/src/ghost-separator'

describe('themed GhostSeparator', () => {
  it('scopes recipe CSS without changing separator semantics', () => {
    const wrapper = mount(GhostSeparator, {
      props: { orientation: 'vertical' },
    })
    const scope = wrapper.get('span')
    const root = wrapper.get('div')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(root.classes()).toContain('ghost-separator')
    expect(root.attributes('role')).toBe('separator')
    expect(root.attributes('aria-orientation')).toBe('vertical')
    expect(root.attributes('data-orientation')).toBe('vertical')
  })
})
