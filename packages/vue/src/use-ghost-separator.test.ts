import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostSeparator } from './use-ghost-separator'

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

describe('useGhostSeparator', () => {
  it('defaults to a horizontal semantic hr without overriding native role', () => {
    const { result, wrapper } = mountComposable(() => useGhostSeparator())

    expect(result.as.value).toBe('hr')
    expect(result.orientation.value).toBe('horizontal')
    expect(result.decorative.value).toBe(false)
    expect(result.rootProps.value.class).toBe('ghost-separator')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['data-orientation']).toBe('horizontal')
    expect(result.rootProps.value.role).toBeUndefined()
    expect(result.rootProps.value['aria-orientation']).toBeUndefined()
    wrapper.unmount()
  })

  it('uses a vertical div with explicit separator semantics', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostSeparator({ orientation: 'vertical' }),
    )

    expect(result.as.value).toBe('div')
    expect(result.rootProps.value.role).toBe('separator')
    expect(result.rootProps.value['aria-orientation']).toBe('vertical')
    expect(result.rootProps.value['data-orientation']).toBe('vertical')
    wrapper.unmount()
  })

  it('removes decorative instances from the accessibility tree', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostSeparator({ decorative: true, orientation: 'vertical' }),
    )

    expect(result.rootProps.value.role).toBe('none')
    expect(result.rootProps.value['aria-orientation']).toBeUndefined()
    wrapper.unmount()
  })

  it('keeps an explicit as even when orientation would pick another tag', () => {
    const as = ref<'hr' | 'div' | 'li'>('li')
    const { result, wrapper } = mountComposable(() =>
      useGhostSeparator({ as, orientation: 'horizontal' }),
    )

    expect(result.as.value).toBe('li')
    expect(result.rootProps.value.role).toBe('separator')
    wrapper.unmount()
  })
})
