import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { describe, expect, it } from 'vitest'

import { mergeLinkRel } from './ghost-link'
import { useGhostLink } from './use-ghost-link'

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

describe('mergeLinkRel', () => {
  it('adds noopener and noreferrer for _blank targets', () => {
    expect(mergeLinkRel('_blank', undefined)).toBe('noopener noreferrer')
    expect(mergeLinkRel('_blank', 'nofollow')).toBe(
      'nofollow noopener noreferrer',
    )
  })

  it('leaves rel unchanged for same-tab targets', () => {
    expect(mergeLinkRel(undefined, 'nofollow')).toBe('nofollow')
    expect(mergeLinkRel('_self', 'noopener')).toBe('noopener')
  })
})

describe('useGhostLink', () => {
  it('exposes root styling hooks', () => {
    const { result, wrapper } = mountComposable(() => useGhostLink())

    expect(result.rootProps.value.class).toBe('ghost-link')
    expect(result.rootProps.value['data-part']).toBe('root')
    expect(result.isDisabled.value).toBe(false)
    wrapper.unmount()
  })

  it('removes href and blocks focus when disabled on native anchors', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostLink({
        as: () => 'a',
        href: () => '/settings',
        disabled: () => true,
      }),
    )

    expect(result.rootProps.value.href).toBeUndefined()
    expect(result.rootProps.value['aria-disabled']).toBe('true')
    expect(result.rootProps.value.tabindex).toBe(-1)
    expect(result.rootProps.value['data-state']).toBe('disabled')
    wrapper.unmount()
  })

  it('shows external affordances for _blank targets', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostLink({
        target: () => '_blank',
        href: () => 'https://example.com',
      }),
    )

    expect(result.showExternalIndicator.value).toBe(true)
    expect(result.showNewTabHint.value).toBe(true)
    expect(result.rootProps.value.rel).toBe('noopener noreferrer')
    wrapper.unmount()
  })

  it('honors the external prop for same-tab navigation', () => {
    const external = ref(false)
    const { result, wrapper } = mountComposable(() =>
      useGhostLink({
        external,
        href: () => 'https://example.com',
      }),
    )

    expect(result.showExternalIndicator.value).toBe(false)
    external.value = true
    expect(result.showExternalIndicator.value).toBe(true)
    wrapper.unmount()
  })
})
