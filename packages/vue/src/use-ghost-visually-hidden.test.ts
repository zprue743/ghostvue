import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostVisuallyHidden } from './use-ghost-visually-hidden'

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

describe('useGhostVisuallyHidden', () => {
  it('starts hidden with clip styles and data-state', () => {
    const { result, wrapper } = mountComposable(() => useGhostVisuallyHidden())

    expect(result.isRevealed.value).toBe(false)
    expect(result.rootProps.value.style?.position).toBe('absolute')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['data-state']).toBe('hidden')
    expect(result.rootProps.value.class).toBe('ghost-visually-hidden')
    wrapper.unmount()
  })

  it('reveals only when focusable and focus is inside', () => {
    const focusable = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useGhostVisuallyHidden({ focusable }),
    )

    result.rootProps.value.onFocusin()
    expect(result.isRevealed.value).toBe(false)

    focusable.value = true
    expect(result.isRevealed.value).toBe(true)
    expect(result.rootProps.value.style).toBeUndefined()
    expect(result.rootProps.value['data-state']).toBeUndefined()

    result.rootProps.value.onFocusout()
    expect(result.isRevealed.value).toBe(false)
    wrapper.unmount()
  })
})
