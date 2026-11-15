import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostInlineAlert,
  type GhostInlineAlertExposed,
} from '../../packages/themes/src/index'

describe('themed GhostInlineAlert', () => {
  it('exposes the inner root and sets data-themed and tone hooks', () => {
    const component = ref<GhostInlineAlertExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(
          GhostInlineAlert,
          { ref: component, tone: 'danger', variant: 'outline' },
          {
            message: () => 'Rows failed to load.',
          },
        ),
    })
    const wrapper = mount(host)
    const root = wrapper.get('[data-ghost-inline-alert]')

    expect(root.attributes('data-themed')).toBe('')
    expect(root.attributes('data-tone')).toBe('danger')
    expect(root.attributes('data-variant')).toBe('outline')
    const exposed = component.value
    expect(exposed?.element).toBe(root.element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
