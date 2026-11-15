import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import { GhostScrollArea } from '../../packages/themes/src/ghost-scroll-area'

describe('themed GhostScrollArea', () => {
  it('attaches data-themed without an extra layout wrapper', () => {
    const wrapper = mount(GhostScrollArea, {
      props: { label: 'List' },
      slots: { default: () => 'Item' },
    })

    const root = wrapper.get('div')
    expect(root.attributes('data-themed')).toBe('')
    expect(root.classes()).toContain('ghost-scroll-area')
    expect(root.attributes('data-part')).toBe('root')
  })
})
