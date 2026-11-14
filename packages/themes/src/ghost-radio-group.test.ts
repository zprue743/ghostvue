import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostRadioGroup,
  GhostRadioGroupItem,
  type GhostRadioGroupExposed,
  type GhostRadioGroupItemExposed,
} from './ghost-radio-group'

describe('ghost-radio-group theme wrapper', () => {
  it('forwards v-model and exposes the inner group root', async () => {
    const model = ref('b')
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup() {
          return () =>
            h(
              GhostRadioGroup,
              {
                modelValue: model.value,
                'onUpdate:modelValue': (value: string) => {
                  model.value = value
                },
                name: 'tier',
                size: 'sm',
                orientation: 'horizontal',
                invalid: true,
                required: true,
              },
              {
                default: () => [
                  h(GhostRadioGroupItem, { value: 'a' }),
                  h(GhostRadioGroupItem, { value: 'b' }),
                ],
              },
            )
        },
      }),
    )

    expect(wrapper.find('[data-size="sm"]').exists()).toBe(true)
    await wrapper.get('input[value="a"]').setValue(true)
    expect(model.value).toBe('a')
  })

  it('runs uncontrolled without forwarding modelValue', () => {
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup: () => () =>
          h(
            GhostRadioGroup,
            { defaultValue: 'a', name: 'tier', disabled: true },
            {
              default: () => h(GhostRadioGroupItem, { value: 'a' }),
            },
          ),
      }),
    )

    expect(wrapper.get('input').attributes('disabled')).toBeDefined()
  })

  it('exposes group focus and blur helpers', () => {
    const group = ref<GhostRadioGroupExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup: () => () =>
          h(
            GhostRadioGroup,
            { ref: group, defaultValue: 'a' },
            {
              default: () => h(GhostRadioGroupItem, { value: 'a' }),
            },
          ),
      }),
      { attachTo: document.body },
    )

    expect(() => {
      group.value?.focus()
      group.value?.blur()
    }).not.toThrow()
    expect(group.value?.element).toBe(
      wrapper.get('[data-ghost-radio-group]').element,
    )
    wrapper.unmount()
  })

  it('applies size data on themed items and exposes item helpers', () => {
    const item = ref<GhostRadioGroupItemExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        components: { GhostRadioGroup, GhostRadioGroupItem },
        setup: () => () =>
          h(
            GhostRadioGroup,
            { defaultValue: 'a' },
            {
              default: () =>
                h(GhostRadioGroupItem, {
                  ref: item,
                  value: 'a',
                  size: 'lg',
                  disabled: true,
                }),
            },
          ),
      }),
    )
    expect(wrapper.find('[data-size="lg"]').exists()).toBe(true)
    expect(item.value?.element).toBe(wrapper.get('input').element)
    expect(() => {
      item.value?.focus()
      item.value?.blur()
    }).not.toThrow()
  })
})
