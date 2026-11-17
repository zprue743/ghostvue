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

  it('preserves fractional precision from value when step is an integer', async () => {
    const wrapper = mount(GhostNumberInput, {
      props: { defaultValue: 1.5, min: 1.5, step: 1 },
    })

    expect(
      wrapper.get('[data-part="decrement"]').attributes('disabled'),
    ).toBeDefined()

    await wrapper.get('[data-part="increment"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2.5])
    expect(
      wrapper.get('[data-part="decrement"]').attributes('disabled'),
    ).toBeUndefined()

    await wrapper.get('[data-part="decrement"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([1.5])
    expect(
      wrapper.get('[data-part="decrement"]').attributes('disabled'),
    ).toBeDefined()
  })

  it('preserves fractional precision from bounds and current value', async () => {
    const fromMin = mount(GhostNumberInput, {
      props: { defaultValue: null, min: 1.25, step: 0.5 },
    })
    await fromMin.get('[data-part="increment"]').trigger('click')
    expect(fromMin.emitted('update:modelValue')?.[0]).toEqual([1.75])

    const toMax = mount(GhostNumberInput, {
      props: { defaultValue: 1.9, max: 2.25, step: 1 },
    })
    await toMax.get('[data-part="increment"]').trigger('click')
    expect(toMax.emitted('update:modelValue')?.[0]).toEqual([2.25])

    const fromValue = mount(GhostNumberInput, {
      props: { defaultValue: 1.234, step: 0.1 },
    })
    await fromValue.get('[data-part="increment"]').trigger('click')
    expect(fromValue.emitted('update:modelValue')?.[0]).toEqual([1.334])
    await fromValue.get('[data-part="decrement"]').trigger('click')
    expect(fromValue.emitted('update:modelValue')?.[1]).toEqual([1.234])
  })

  it('cleans up binary floating-point drift and scientific-notation steps', async () => {
    const floatWrapper = mount(GhostNumberInput, {
      props: { defaultValue: 0.1, step: 0.2 },
    })
    await floatWrapper.get('[data-part="increment"]').trigger('click')
    expect(floatWrapper.emitted('update:modelValue')?.[0]).toEqual([0.3])

    const sciWrapper = mount(GhostNumberInput, {
      props: { defaultValue: 0, step: 1e-7 },
    })
    await sciWrapper.get('[data-part="increment"]').trigger('click')
    expect(sciWrapper.emitted('update:modelValue')?.[0]).toEqual([1e-7])
  })
})
