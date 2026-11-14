import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostProgress } from '../../packages/themes/src/ghost-progress'

describe('themed GhostProgress', () => {
  it('scopes recipe CSS without changing progressbar semantics', () => {
    const wrapper = mount(GhostProgress, {
      props: {
        value: 40,
        label: 'Uploading report',
        size: 'sm',
        tone: 'neutral',
      },
    })
    const scope = wrapper.get('span')
    const root = wrapper.get('[role="progressbar"]')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(root.classes()).toContain('ghost-progress')
    expect(root.attributes('aria-valuenow')).toBe('40')
    expect(root.attributes('aria-label')).toBe('Uploading report')
    expect(root.attributes('data-size')).toBe('sm')
    expect(root.attributes('data-tone')).toBe('neutral')
  })

  it('omits default size and tone hooks', () => {
    const wrapper = mount(GhostProgress, {
      props: { value: 10, label: 'Export' },
    })
    const root = wrapper.get('[role="progressbar"]')

    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.attributes('data-tone')).toBeUndefined()
  })

  it('forwards null value as the indeterminate fallback', () => {
    const wrapper = mount(GhostProgress, {
      props: { value: null, label: 'Preparing export' },
    })
    const root = wrapper.get('[role="progressbar"]')

    expect(root.attributes('data-state')).toBe('indeterminate')
    expect(root.attributes('aria-valuenow')).toBeUndefined()
  })
})
