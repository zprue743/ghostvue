import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useGhostCheckbox } from './use-ghost-checkbox'

function mountComposable<Value>(setup: () => Value) {
  let result!: Value
  const wrapper = mount(
    defineComponent({
      setup() {
        result = setup()
        return () => h('div')
      },
    }),
  )
  return { result, wrapper }
}

describe('useGhostCheckbox', () => {
  it('toggles through a template v-bind of rootProps', async () => {
    const onChange = vi.fn()
    const Harness = defineComponent({
      setup() {
        const checkbox = useGhostCheckbox({ onChange })
        return { rootProps: checkbox.rootProps }
      },
      template: '<input v-bind="rootProps" />',
    })
    const wrapper = mount(Harness)

    await wrapper.get('input').setValue(true)

    expect(onChange).toHaveBeenCalledWith(true)
    wrapper.unmount()
  })

  it('toggles through v-bind rootProps on a native input', async () => {
    const onChange = vi.fn()
    const Harness = defineComponent({
      setup() {
        const checkbox = useGhostCheckbox({ onChange })
        return () => h('input', checkbox.rootProps.value)
      },
    })
    const wrapper = mount(Harness)

    await wrapper.get('input').setValue(true)

    expect(onChange).toHaveBeenCalledWith(true)
    expect((wrapper.get('input').element as HTMLInputElement).checked).toBe(
      true,
    )
    wrapper.unmount()
  })

  it('defaults to an enabled, unchecked native checkbox', () => {
    const { result, wrapper } = mountComposable(() => useGhostCheckbox())

    expect(result.rootProps.value.type).toBe('checkbox')
    expect(result.rootProps.value.checked).toBe(false)
    expect(result.rootProps.value.disabled).toBeUndefined()
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['data-state']).toBeUndefined()
    expect(result.isChecked.value).toBe(false)
    expect(result.isIndeterminate.value).toBe(false)
    wrapper.unmount()
  })

  it('seeds uncontrolled state from defaultValue', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostCheckbox({ defaultValue: true }),
    )

    expect(result.isChecked.value).toBe(true)
    expect(result.rootProps.value.checked).toBe(true)
    expect(result.rootProps.value['data-state']).toBe('checked')
    wrapper.unmount()
  })

  it('emits once when uncontrolled checked state changes', () => {
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useGhostCheckbox({ onChange }),
    )

    result.isChecked.value = true

    expect(result.isChecked.value).toBe(true)
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(true)

    result.isChecked.value = true
    expect(onChange).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('restores the native box when a controlled parent ignores the emit', async () => {
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useGhostCheckbox({ modelValue: false, onChange }),
    )

    const input = document.createElement('input')
    input.type = 'checkbox'
    document.body.append(input)
    input.checked = true
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', { value: input })
    result.rootProps.value.onChange(event)

    expect(onChange).toHaveBeenCalledWith(true)
    expect(result.isChecked.value).toBe(false)
    await nextTick()
    expect(input.checked).toBe(false)
    input.remove()
    wrapper.unmount()
  })

  it('restores native indeterminate when a controlled parent ignores mixed activation', async () => {
    const onChange = vi.fn()
    const Harness = defineComponent({
      setup() {
        const checkbox = useGhostCheckbox({
          modelValue: false,
          indeterminate: true,
          onChange,
        })
        return { rootProps: checkbox.rootProps }
      },
      template: '<input v-bind="rootProps" />',
    })
    const wrapper = mount(Harness, { attachTo: document.body })
    const input = wrapper.get('input').element as HTMLInputElement
    input.indeterminate = true
    await nextTick()

    input.checked = true
    input.indeterminate = false
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()

    expect(onChange).toHaveBeenCalledWith(true)
    expect(input.checked).toBe(false)
    expect(input.indeterminate).toBe(true)
    wrapper.unmount()
  })

  it('reads a controlled model without writing local state', () => {
    const modelValue = ref(false)
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useGhostCheckbox({ modelValue, onChange }),
    )

    result.isChecked.value = true

    expect(onChange).toHaveBeenCalledWith(true)
    expect(result.isChecked.value).toBe(false)

    modelValue.value = true
    expect(result.isChecked.value).toBe(true)
    expect(result.rootProps.value['data-state']).toBe('checked')
    wrapper.unmount()
  })

  it('exposes mixed as data-state even when checked is true', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostCheckbox({ modelValue: true, indeterminate: true }),
    )

    expect(result.rootProps.value.checked).toBe(true)
    expect(result.rootProps.value['data-state']).toBe('indeterminate')
    wrapper.unmount()
  })

  it('exposes native disabled without a data-state of disabled', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostCheckbox({ disabled: true, modelValue: true }),
    )

    expect(result.rootProps.value.disabled).toBe(true)
    expect(result.rootProps.value['data-state']).toBe('checked')
    wrapper.unmount()
  })

  it('ignores change events dispatched against a disabled control', () => {
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useGhostCheckbox({ disabled: true, onChange }),
    )

    const input = document.createElement('input')
    input.type = 'checkbox'
    input.checked = true
    const event = new Event('change', { bubbles: true })
    Object.defineProperty(event, 'target', { value: input })
    result.rootProps.value.onChange(event)

    expect(onChange).not.toHaveBeenCalled()
    expect(result.isChecked.value).toBe(false)
    wrapper.unmount()
  })
})
