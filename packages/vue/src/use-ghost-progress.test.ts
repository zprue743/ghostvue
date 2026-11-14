import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostProgress } from './use-ghost-progress'

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

describe('useGhostProgress', () => {
  it('defaults to an unnamed indeterminate progressbar with ARIA max 100', () => {
    const { result, wrapper } = mountComposable(() => useGhostProgress())

    expect(result.isIndeterminate.value).toBe(true)
    expect(result.value.value).toBeNull()
    expect(result.max.value).toBe(100)
    expect(result.rootProps.value.class).toBe('ghost-progress')
    expect(result.rootProps.value.role).toBe('progressbar')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.rootProps.value['data-state']).toBe('indeterminate')
    expect(result.rootProps.value['aria-valuemin']).toBe('0')
    expect(result.rootProps.value['aria-valuemax']).toBe('100')
    expect(result.rootProps.value['aria-valuenow']).toBeUndefined()
    expect(result.rootProps.value['aria-valuetext']).toBeUndefined()
    expect(result.indicatorProps.value['data-part']).toBe('indicator')
    expect(result.indicatorProps.value.style).toBeUndefined()
    wrapper.unmount()
  })

  it('exposes clamped determinate values and a default percent value text', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostProgress({ value: 40, max: 100, label: 'Uploading report' }),
    )

    expect(result.isIndeterminate.value).toBe(false)
    expect(result.value.value).toBe(40)
    expect(result.percent.value).toBe(40)
    expect(result.valueText.value).toBe('40%')
    expect(result.rootProps.value['data-state']).toBeUndefined()
    expect(result.rootProps.value['aria-label']).toBe('Uploading report')
    expect(result.rootProps.value['aria-valuenow']).toBe('40')
    expect(result.rootProps.value['aria-valuetext']).toBe('40%')
    expect(result.indicatorProps.value.style).toEqual({ inlineSize: '40%' })
    wrapper.unmount()
  })

  it('treats null and non-finite values as indeterminate', () => {
    const value = ref<number | null>(null)
    const { result, wrapper } = mountComposable(() =>
      useGhostProgress({ value }),
    )

    expect(result.isIndeterminate.value).toBe(true)

    value.value = Number.NaN
    expect(result.isIndeterminate.value).toBe(true)

    value.value = Number.POSITIVE_INFINITY
    expect(result.isIndeterminate.value).toBe(true)
    wrapper.unmount()
  })

  it('clamps finite values to [0, max] and falls back when max is not usable', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostProgress({ value: 150, max: 0 }),
    )

    expect(result.max.value).toBe(100)
    expect(result.value.value).toBe(100)
    expect(result.valueText.value).toBe('100%')
    wrapper.unmount()
  })

  it('uses custom value text instead of the default percent', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostProgress({ value: 3, max: 10, valueText: '3 of 10 files' }),
    )

    expect(result.rootProps.value['aria-valuenow']).toBe('3')
    expect(result.rootProps.value['aria-valuemax']).toBe('10')
    expect(result.rootProps.value['aria-valuetext']).toBe('3 of 10 files')
    expect(result.indicatorProps.value.style).toEqual({ inlineSize: '30%' })
    wrapper.unmount()
  })
})
