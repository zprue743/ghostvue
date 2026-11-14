import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'

import GhostNumberInput from './GhostNumberInput.vue'

describe('useGhostNumberInput formatting', () => {
  it('formats and parses en-US decimal separators', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostNumberInput, {
              modelValue: 1200.5,
              locale: 'en-US',
              min: 0,
            })
        },
      }),
    )

    const input = wrapper.get('input').element as HTMLInputElement
    expect(input.value).toBe('1,200.5')
    input.value = '2,500.25'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(
      wrapper
        .findComponent(GhostNumberInput)
        .emitted('update:modelValue')
        ?.at(-1),
    ).toEqual([2500.25])
  })

  it('steps from null using the minimum when provided', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { defaultValue: null, min: 5, max: 20, step: 5 },
    })
    await wrapper.get('[data-part="increment"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10])
  })
})
