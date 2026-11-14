import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'

import { useGhostSwitch } from './use-ghost-switch'

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

describe('useGhostSwitch', () => {
  it('defaults to an off button switch that does not submit', () => {
    const { result, wrapper } = mountComposable(() => useGhostSwitch())

    expect(result.checked.value).toBe(false)
    expect(result.rootProps.value.type).toBe('button')
    expect(result.rootProps.value.role).toBe('switch')
    expect(result.rootProps.value['aria-checked']).toBe('false')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['data-state']).toBe('unchecked')
    expect(result.inputProps.value.type).toBe('hidden')
    expect(result.inputProps.value.name).toBeUndefined()
    wrapper.unmount()
  })

  it('toggles and exposes checked data-state', () => {
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useGhostSwitch({ onChange }),
    )

    result.toggle()

    expect(result.checked.value).toBe(true)
    expect(result.rootProps.value['aria-checked']).toBe('true')
    expect(result.rootProps.value['data-state']).toBe('checked')
    expect(onChange).toHaveBeenCalledOnce()
    expect(onChange).toHaveBeenCalledWith(true)
    wrapper.unmount()
  })

  it('does not toggle while disabled or readonly', () => {
    const disabled = ref(true)
    const readonly = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useGhostSwitch({ disabled, readonly }),
    )

    result.toggle()
    expect(result.checked.value).toBe(false)
    expect(result.rootProps.value.disabled).toBe(true)

    disabled.value = false
    readonly.value = true
    result.toggle()
    expect(result.checked.value).toBe(false)
    expect(result.rootProps.value['aria-readonly']).toBe('true')
    wrapper.unmount()
  })

  it('submits name=value only while on and enabled', () => {
    const checked = ref(true)
    const disabled = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useGhostSwitch({
        modelValue: checked,
        disabled,
        name: 'digest',
        value: 'daily',
      }),
    )

    expect(result.inputProps.value.name).toBe('digest')
    expect(result.inputProps.value.value).toBe('daily')

    checked.value = false
    expect(result.inputProps.value.name).toBeUndefined()

    checked.value = true
    disabled.value = true
    expect(result.inputProps.value.name).toBeUndefined()
    wrapper.unmount()
  })

  it('skips toggle when the activating click was cancelled', () => {
    const { result, wrapper } = mountComposable(() => useGhostSwitch())
    const event = new MouseEvent('click', { cancelable: true })
    event.preventDefault()

    result.rootProps.value.onClick(event)

    expect(result.checked.value).toBe(false)
    wrapper.unmount()
  })
})
