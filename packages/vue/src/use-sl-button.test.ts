import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useSlButton } from './use-sl-button'

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

describe('useSlButton', () => {
  it('defaults to a non-submitting native type', () => {
    const { result, wrapper } = mountComposable(() => useSlButton())

    expect(result.rootProps.value.type).toBe('button')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.isLoading.value).toBe(false)
    wrapper.unmount()
  })

  it('exposes loading as data-state without disabling', () => {
    const loading = ref(true)
    const { result, wrapper } = mountComposable(() => useSlButton({ loading }))

    expect(result.rootProps.value.disabled).toBeUndefined()
    expect(result.rootProps.value['aria-disabled']).toBe('true')
    expect(result.rootProps.value['data-state']).toBe('loading')
    wrapper.unmount()
  })

  it('exposes disabled as data-state and prefers loading when both are set', () => {
    const disabled = ref(true)
    const loading = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useSlButton({ disabled, loading }),
    )

    expect(result.rootProps.value['data-state']).toBe('disabled')
    loading.value = true
    expect(result.rootProps.value['data-state']).toBe('loading')
    wrapper.unmount()
  })
})
