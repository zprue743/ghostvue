import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostSpinner } from './use-ghost-spinner'

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

describe('useGhostSpinner', () => {
  it('exposes status semantics and a default loading message', () => {
    const { result, wrapper } = mountComposable(() => useGhostSpinner())

    expect(result.rootProps.value.role).toBe('status')
    expect(result.rootProps.value.class).toBe('ghost-spinner')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.label.value).toBe('Loading')
    wrapper.unmount()
  })

  it('uses the consumer message when one is provided', () => {
    const label = ref('Refreshing reports')
    const { result, wrapper } = mountComposable(() =>
      useGhostSpinner({ label }),
    )

    expect(result.label.value).toBe('Refreshing reports')
    label.value = 'Deleting rows'
    expect(result.label.value).toBe('Deleting rows')
    wrapper.unmount()
  })
})
