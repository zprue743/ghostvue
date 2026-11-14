import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostNumberInput,
  type GhostNumberInputExposed,
} from '../../packages/themes/src/index'

describe('themed GhostNumberInput', () => {
  it('scopes recipe CSS and forwards behavioral props', () => {
    const wrapper = mount(GhostNumberInput, {
      props: {
        invalid: true,
        size: 'sm',
        block: true,
        modelValue: 4,
        locale: 'en-US',
        formatOptions: { maximumFractionDigits: 0 },
      },
    })
    const scope = wrapper.get('span.ghost-themed-scope')
    const root = wrapper.get('.ghost-number-input')
    const spinbutton = wrapper.get('[role="spinbutton"]')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(root.attributes('data-size')).toBe('sm')
    expect(root.attributes()).toHaveProperty('data-block')
    expect(spinbutton.attributes('aria-invalid')).toBe('true')
    expect(spinbutton.attributes('aria-valuenow')).toBe('4')
  })

  it('omits default size on the root', () => {
    const wrapper = mount(GhostNumberInput)
    const root = wrapper.get('.ghost-number-input')

    expect(root.attributes('data-size')).toBeUndefined()
    expect(root.attributes('data-block')).toBeUndefined()
  })

  it('emits v-model updates from button interaction', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { modelValue: 2, min: 0, max: 10 },
    })

    await wrapper.get('[data-part="increment"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([3])
  })

  it('exposes the spinbutton through the public themed export', () => {
    const component = ref<GhostNumberInputExposed | null>(null)
    const host = defineComponent({
      setup: () => () =>
        h(GhostNumberInput, {
          ref: component,
          defaultValue: 4,
          min: 0,
          max: 10,
        }),
    })
    const wrapper = mount(host, { attachTo: document.body })
    const themed = wrapper.findComponent(GhostNumberInput)
    const exposed = component.value
    expect(exposed?.element).toBe(wrapper.get('[role="spinbutton"]').element)
    exposed?.increment()
    expect(themed.emitted('update:modelValue')?.[0]).toEqual([5])
    exposed?.decrement()
    expect(themed.emitted('update:modelValue')?.[1]).toEqual([4])
    exposed?.focus()
    expect(document.activeElement).toBe(exposed?.element)
    exposed?.blur()
    wrapper.unmount()
    expect(exposed?.element).toBeNull()
  })
})
