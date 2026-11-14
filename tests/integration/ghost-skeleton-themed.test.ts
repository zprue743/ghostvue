import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostSkeleton } from '../../packages/themes/src/ghost-skeleton'

describe('themed GhostSkeleton', () => {
  it('scopes styles with data-themed and omits data-shape for the text default', () => {
    const wrapper = mount(GhostSkeleton, {
      attrs: { 'data-testid': 'bone' },
    })

    const root = wrapper.get('.ghost-skeleton')
    expect(root.attributes('data-themed')).toBe('')
    expect(root.attributes('data-testid')).toBe('bone')
    expect(root.attributes('aria-hidden')).toBe('true')
    expect(root.attributes('data-shape')).toBeUndefined()
    expect(root.attributes('data-part')).toBe('root')
    expect(wrapper.find('.ghost-themed-scope').exists()).toBe(false)
    wrapper.unmount()
  })

  it('sets data-shape for rect and circle and forwards as without a wrapper', () => {
    const rect = mount(GhostSkeleton, { props: { shape: 'rect' } })
    expect(rect.get('.ghost-skeleton').attributes('data-shape')).toBe('rect')
    rect.unmount()

    const cell = mount(GhostSkeleton, {
      props: { as: 'td', shape: 'circle' },
    })
    expect(cell.html().startsWith('<td ')).toBe(true)
    expect(cell.get('td').attributes('data-shape')).toBe('circle')
    expect(cell.get('td').attributes('data-themed')).toBe('')
    expect(cell.get('td').attributes('aria-hidden')).toBe('true')
    cell.unmount()
  })
})
