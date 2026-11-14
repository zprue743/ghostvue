import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostToolbar,
  type GhostToolbarExposed,
} from '../../packages/themes/src/index'

describe('themed GhostToolbar', () => {
  it('exposes the mounted content root through the public themed export', () => {
    const component = ref<GhostToolbarExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostToolbar, { ref: component, label: 'Row actions' }, () =>
          h('button', { type: 'button' }, 'Edit'),
        ),
    })
    const wrapper = mount(host)
    const exposed = component.value
    expect(exposed?.element).toBe(wrapper.get('[data-ghost-toolbar]').element)
    expect(exposed?.element).not.toBe(wrapper.element)
    exposed?.focus()
    exposed?.blur()
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
