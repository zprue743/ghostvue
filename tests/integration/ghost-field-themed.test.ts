import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostInput,
  type GhostFieldExposed,
} from '../../packages/themes/src/index'

describe('themed GhostField', () => {
  it('exposes the mounted field root through the public themed export', () => {
    const component = ref<GhostFieldExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostField, { ref: component, class: 'ghost-theme' }, () => [
          h(GhostFieldLabel, {}, () => 'Region'),
          h(GhostFieldControl, null, {
            default: (field: Record<string, unknown>) => h(GhostInput, field),
          }),
        ]),
    })
    const wrapper = mount(host)
    const exposed = component.value
    expect(exposed?.element).toBe(wrapper.get('[data-ghost-field]').element)
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
