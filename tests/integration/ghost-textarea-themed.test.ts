import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostTextarea } from '../../packages/themes/src/ghost-textarea'

describe('themed GhostTextarea', () => {
  it('scopes recipe CSS and forwards field semantics', async () => {
    const wrapper = mount(GhostTextarea, {
      attrs: { 'aria-label': 'Bio' },
      props: {
        invalid: true,
        size: 'lg',
        modelValue: 'themed',
      },
    })
    const scope = wrapper.get('span')
    const root = wrapper.get('textarea')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(root.classes()).toContain('ghost-textarea')
    expect(root.attributes('aria-invalid')).toBe('true')
    expect(root.attributes('data-size')).toBe('lg')
    expect(root.element.value).toBe('themed')

    await root.setValue('next')
    expect(wrapper.emitted('update:modelValue')).toEqual([['next']])
  })
})
