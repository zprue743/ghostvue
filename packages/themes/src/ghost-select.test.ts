import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostSelect,
  GhostSelectContent,
  GhostSelectGroup,
  GhostSelectLabel,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
  type GhostSelectExposed,
  type GhostSelectContentExposed,
  type GhostSelectTriggerExposed,
} from './index'

describe('ghost-select theme wrapper', () => {
  it('forwards v-model and exposes the inner select root', () => {
    const model = ref<string | undefined>('b')
    const selectRef = ref<GhostSelectExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostSelect,
            {
              ref: selectRef,
              modelValue: model.value,
              'onUpdate:modelValue': (value: string | undefined) => {
                model.value = value
              },
              name: 'fruit',
              required: true,
              invalid: true,
            },
            {
              default: () => [
                h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                h(GhostSelectContent, { portal: false }, () => [
                  h(GhostSelectOption, { value: 'a' }, () => 'Apple'),
                  h(GhostSelectOption, { value: 'b' }, () => 'Banana'),
                ]),
              ],
            },
          ),
      }),
    )

    expect(selectRef.value?.element).toBeTruthy()
    expect(
      wrapper.get('[data-part="trigger"]').attributes('aria-invalid'),
    ).toBe('true')
    wrapper.unmount()
  })

  it('applies data-themed on content and grouped options when open', () => {
    const contentRef = ref<GhostSelectContentExposed | null>(null)
    const triggerRef = ref<GhostSelectTriggerExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostSelect,
            { defaultOpen: true, name: 'fruit' },
            {
              default: () => [
                h(
                  GhostSelectTrigger,
                  { ref: triggerRef, 'aria-label': 'Fruit' },
                  () => h(GhostSelectValue, { placeholder: 'Pick' }),
                ),
                h(
                  GhostSelectContent,
                  { ref: contentRef, portal: false, placement: 'top' },
                  () =>
                    h(GhostSelectGroup, null, () => [
                      h(GhostSelectLabel, null, () => 'Top picks'),
                      h(GhostSelectOption, { value: 'a' }, () => 'Apple'),
                    ]),
                ),
              ],
            },
          ),
      }),
    )

    expect(wrapper.get('[data-part="content"]').attributes('data-themed')).toBe(
      '',
    )
    expect(contentRef.value?.element).toBeTruthy()
    expect(triggerRef.value?.focus).toBeTypeOf('function')
    wrapper.unmount()
  })
})
