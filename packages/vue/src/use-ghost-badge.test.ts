import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostBadge } from './use-ghost-badge'

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

describe('useGhostBadge', () => {
  it('exposes the unstyled root class and data-part without a state hook', () => {
    const { result, wrapper } = mountComposable(() => useGhostBadge())

    expect(result.rootProps.value.class).toBe('ghost-badge')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value).not.toHaveProperty('data-state')
    expect(result.rootProps.value).not.toHaveProperty('role')
    wrapper.unmount()
  })
})
