import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostInput } from './use-ghost-input'

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

function inputEvent(from: HTMLInputElement) {
  const event = new Event('input', { bubbles: true })
  Object.defineProperty(event, 'target', { value: from })
  return event
}

describe('useGhostInput', () => {
  it('defaults to an empty text field', () => {
    const { result, wrapper } = mountComposable(() => useGhostInput())

    expect(result.value.value).toBe('')
    expect(result.rootProps.value.class).toBe('ghost-input')
    expect(result.rootProps.value.type).toBe('text')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['data-state']).toBeUndefined()
    expect(result.rootProps.value['aria-invalid']).toBeUndefined()
    wrapper.unmount()
  })

  it('writes from input events and skips when disabled or readonly', () => {
    const disabled = ref(false)
    const readonly = ref(false)
    const emitted: string[] = []
    const { result, wrapper } = mountComposable(() =>
      useGhostInput({
        disabled,
        readonly,
        onChange: (value) => {
          emitted.push(value)
        },
      }),
    )
    const field = document.createElement('input')

    field.value = 'typed'
    result.rootProps.value.onInput(inputEvent(field))
    expect(result.value.value).toBe('typed')
    expect(emitted).toEqual(['typed'])

    disabled.value = true
    field.value = 'blocked'
    result.rootProps.value.onInput(inputEvent(field))
    expect(result.value.value).toBe('typed')

    disabled.value = false
    readonly.value = true
    field.value = 'also-blocked'
    result.rootProps.value.onInput(inputEvent(field))
    expect(result.value.value).toBe('typed')
    wrapper.unmount()
  })

  it('exposes data-state with invalid over disabled over readonly', () => {
    const disabled = ref(false)
    const readonly = ref(true)
    const invalid = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useGhostInput({ disabled, invalid, readonly }),
    )

    expect(result.rootProps.value['data-state']).toBe('readonly')
    disabled.value = true
    expect(result.rootProps.value['data-state']).toBe('disabled')
    invalid.value = true
    expect(result.rootProps.value['data-state']).toBe('invalid')
    expect(result.rootProps.value['aria-invalid']).toBe('true')
    wrapper.unmount()
  })

  it('applyFormReset writes the captured seed', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostInput({ defaultValue: 'seed' }),
    )

    result.value.value = 'later'
    result.applyFormReset()
    expect(result.value.value).toBe('seed')
    wrapper.unmount()
  })
})
