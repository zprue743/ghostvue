import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostEmptyState,
  type GhostEmptyStateExposed,
} from '../../packages/themes/src/index'

describe('themed GhostEmptyState', () => {
  it('exposes the inner root and sets data-themed', () => {
    const component = ref<GhostEmptyStateExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostEmptyState,
          { ref: component },
          {
            title: () => 'Nothing here',
          },
        ),
    })
    const wrapper = mount(host)
    const root = wrapper.get('[data-ghost-empty-state]')

    expect(root.attributes('data-themed')).toBe('')
    const exposed = component.value
    expect(exposed?.element).toBe(root.element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
