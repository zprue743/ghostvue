import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import { useGhostAccordion } from './use-ghost-accordion'

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

describe('useGhostAccordion', () => {
  it('opens one item at a time in single mode', () => {
    const { result } = mountComposable(() => useGhostAccordion())
    expect(result.isItemOpen('a')).toBe(false)
    result.setItemOpen('a', true)
    expect(result.modelValue.value).toBe('a')
    result.setItemOpen('b', true)
    expect(result.modelValue.value).toBe('b')
    expect(result.isItemOpen('a')).toBe(false)
  })

  it('allows collapsing the open item when collapsible', () => {
    const { result } = mountComposable(() =>
      useGhostAccordion({ collapsible: true, defaultValue: 'a' }),
    )
    expect(result.isItemOpen('a')).toBe(true)
    result.setItemOpen('a', false)
    expect(result.modelValue.value).toBeUndefined()
  })

  it('prevents collapsing in non-collapsible single mode', () => {
    const { result } = mountComposable(() =>
      useGhostAccordion({ defaultValue: 'a' }),
    )
    result.setItemOpen('a', false)
    expect(result.modelValue.value).toBe('a')
  })

  it('tracks multiple open values', () => {
    const { result } = mountComposable(() =>
      useGhostAccordion({ type: 'multiple', defaultValue: ['a'] }),
    )
    result.setItemOpen('b', true)
    expect(result.modelValue.value).toEqual(['a', 'b'])
    result.setItemOpen('a', false)
    expect(result.modelValue.value).toEqual(['b'])
  })

  it('normalizes a lone string default in multiple mode', () => {
    const { result } = mountComposable(() =>
      useGhostAccordion({ type: 'multiple', defaultValue: 'b' }),
    )
    expect(result.isItemOpen('b')).toBe(true)
  })

  it('emits value changes when controlled', () => {
    const updates: (string | string[] | undefined)[] = []
    const modelValue = ref<string | undefined>('a')
    mountComposable(() =>
      useGhostAccordion({
        modelValue: () => modelValue.value,
        onValueChange: (next) => {
          updates.push(next)
          modelValue.value = typeof next === 'string' ? next : undefined
        },
      }),
    ).result.setItemOpen('b', true)
    expect(updates).toEqual(['b'])
  })
})
