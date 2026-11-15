import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostScrollArea } from './use-ghost-scroll-area'

const Host = defineComponent({
  props: {
    label: { type: String, default: undefined },
    orientation: {
      type: String as () => 'vertical' | 'horizontal' | 'both',
      default: 'vertical',
    },
  },
  setup(props) {
    const element = ref<HTMLElement | null>(null)
    const { rootProps } = useGhostScrollArea(
      {
        label: () => props.label,
        orientation: () => props.orientation,
      },
      element,
    )
    return () =>
      h('div', {
        ref: element,
        ...rootProps.value,
        style: rootProps.value.style,
      })
  },
})

describe('useGhostScrollArea', () => {
  it('maps horizontal orientation to overflow-x', () => {
    const wrapper = mount(Host, {
      props: { orientation: 'horizontal' },
    })

    const style = wrapper.get('div').attributes('style') ?? ''
    expect(style).toContain('overflow-x: auto')
    expect(style).toContain('overflow-y: hidden')
    expect(wrapper.get('div').attributes('data-orientation')).toBe('horizontal')
  })
})
