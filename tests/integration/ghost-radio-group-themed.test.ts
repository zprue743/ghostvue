import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostRadioGroup,
  GhostRadioGroupItem,
  type GhostRadioGroupExposed,
} from '../../packages/themes/src/index'

describe('themed GhostRadioGroup', () => {
  it('exposes the group root through the public themed export', () => {
    const component = ref<GhostRadioGroupExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostRadioGroup,
          { ref: component, name: 'plan' },
          {
            default: () => h(GhostRadioGroupItem, { value: 'a' }),
          },
        ),
    })
    const wrapper = mount(host)
    const exposed = component.value
    expect(exposed?.element).toBe(
      wrapper.get('[data-ghost-radio-group]').element,
    )
    expect(exposed?.element).not.toBe(wrapper.element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
