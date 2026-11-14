import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostSkeleton } from './use-ghost-skeleton'

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

describe('useGhostSkeleton', () => {
  it('exposes decorative hiding bindings and no live-region semantics', () => {
    const { result, wrapper } = mountComposable(() => useGhostSkeleton())

    expect(result.rootProps.value.class).toBe('ghost-skeleton')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['aria-hidden']).toBe('true')
    expect(result.rootProps.value.inert).toBe(true)
    expect(result.rootProps.value).not.toHaveProperty('role')
    expect(result.rootProps.value).not.toHaveProperty('aria-busy')
    expect(result.rootProps.value).not.toHaveProperty('aria-live')
    expect(result.rootProps.value).not.toHaveProperty('data-state')
    wrapper.unmount()
  })
})
