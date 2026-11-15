import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostSegmentedControl,
  GhostSegmentedControlItem,
  type GhostSegmentedControlExposed,
} from '../../packages/themes/src/index'

describe('themed GhostSegmentedControl', () => {
  it('exposes the mounted root through the themed wrapper', async () => {
    const groupRef = ref<GhostSegmentedControlExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostSegmentedControl,
          { ref: groupRef, 'aria-label': 'Range', defaultValue: 'week' },
          {
            default: () => [
              h(GhostSegmentedControlItem, { value: 'day' }, () => 'Day'),
              h(GhostSegmentedControlItem, { value: 'week' }, () => 'Week'),
            ],
          },
        ),
    })
    const wrapper = mount(host)
    const group = groupRef.value
    expect(group?.element).toBe(
      wrapper.get('[data-ghost-segmented-control]').element,
    )
    await flushPromises()
    expect(() => group?.focus()).not.toThrow()
    wrapper.unmount()
  })

  it('applies data-themed on group and items', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostSegmentedControl,
            { 'aria-label': 'View', defaultValue: 'list' },
            {
              default: () =>
                h(GhostSegmentedControlItem, { value: 'list' }, () => 'List'),
            },
          ),
      }),
    )
    expect(wrapper.get('[data-themed]').attributes('data-themed')).toBe('')
    wrapper.unmount()
  })
})
