import { mount } from '@vue/test-utils'
import {
  defineComponent,
  h,
  nextTick,
  ref,
  type WritableComputedRef,
} from 'vue'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'

import { useControllableState } from './use-controllable-state'

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

describe('useControllableState', () => {
  it('starts at defaultValue when the prop is undefined', () => {
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: (): boolean | undefined => undefined,
        defaultValue: false,
      }),
    )

    expect(result.value).toBe(false)
    wrapper.unmount()
  })

  it('updates local state and emits once in uncontrolled mode', () => {
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: (): boolean | undefined => undefined,
        defaultValue: false,
        onChange,
      }),
    )

    result.value = true

    expect(result.value).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(true)
    wrapper.unmount()
  })

  it('does not emit when the assigned value is unchanged', () => {
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: (): boolean | undefined => undefined,
        defaultValue: false,
        onChange,
      }),
    )

    result.value = false

    expect(onChange).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('reads the prop when it is defined', () => {
    const prop = ref(true)
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: () => prop.value,
        defaultValue: false,
      }),
    )

    expect(result.value).toBe(true)
    wrapper.unmount()
  })

  it('emits without writing local state in controlled mode until the parent updates', async () => {
    const prop = ref(false)
    const onChange = vi.fn((value: boolean) => {
      prop.value = value
    })
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: () => prop.value,
        defaultValue: false,
        onChange,
      }),
    )

    result.value = true

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(true)
    await nextTick()
    expect(result.value).toBe(true)
    wrapper.unmount()
  })

  it('keeps the previous value when a controlled parent ignores the emit', () => {
    const prop = ref(false)
    const onChange = vi.fn()
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: () => prop.value,
        defaultValue: false,
        onChange,
      }),
    )

    result.value = true

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(result.value).toBe(false)
    wrapper.unmount()
  })

  it('reflects later parent prop updates in controlled mode', async () => {
    const prop = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: () => prop.value,
        defaultValue: false,
      }),
    )

    prop.value = true
    await nextTick()

    expect(result.value).toBe(true)
    wrapper.unmount()
  })

  it('treats null as a defined controlled value', () => {
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: () => null,
        defaultValue: 'fallback',
      }),
    )

    expect(result.value).toBeNull()
    wrapper.unmount()
  })

  it('calls onChange synchronously in the setter', () => {
    const seen: boolean[] = []
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: (): boolean | undefined => undefined,
        defaultValue: false,
        onChange: (value) => {
          seen.push(value)
        },
      }),
    )

    result.value = true
    expect(seen).toEqual([true])
    wrapper.unmount()
  })

  it('does not re-read a later defaultValue change in uncontrolled mode', async () => {
    const defaultValue = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: (): boolean | undefined => undefined,
        defaultValue: () => defaultValue.value,
      }),
    )

    defaultValue.value = true
    await nextTick()

    expect(result.value).toBe(false)
    wrapper.unmount()
  })

  it('warns once per control-mode switch', async () => {
    const prop = ref<boolean | undefined>(false)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: () => prop.value,
        defaultValue: true,
      }),
    )

    expect(result.value).toBe(false)

    prop.value = undefined
    await nextTick()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenLastCalledWith(
      expect.stringContaining('[slop-ui SLOP001]'),
    )
    expect(warn).toHaveBeenLastCalledWith(
      expect.stringContaining('controlled to uncontrolled'),
    )
    expect(warn).toHaveBeenLastCalledWith(
      expect.stringContaining('docs/warnings.md#slop001'),
    )
    expect(result.value).toBe(false)

    prop.value = false
    await nextTick()
    expect(warn).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenLastCalledWith(
      expect.stringContaining('uncontrolled to controlled'),
    )

    warn.mockRestore()
    wrapper.unmount()
  })

  it('infers a writable computed of the value type', () => {
    const { result, wrapper } = mountComposable(() =>
      useControllableState({
        prop: (): boolean | undefined => undefined,
        defaultValue: false,
      }),
    )

    expectTypeOf(result).toEqualTypeOf<WritableComputedRef<boolean>>()
    wrapper.unmount()
  })
})
