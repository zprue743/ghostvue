import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import { GhostCheckbox } from '../../packages/themes/src/ghost-checkbox'
import type { GhostCheckboxExposed } from '../../packages/themes/src/ghost-checkbox'

describe('themed GhostCheckbox', () => {
  it('scopes recipe CSS and omits default size and tone hooks', () => {
    const wrapper = mount(GhostCheckbox)
    const scope = wrapper.get('span')
    const input = wrapper.get('input')

    expect(scope.classes()).toContain('ghost-themed-scope')
    expect(input.classes()).toContain('ghost-checkbox')
    expect(input.attributes('type')).toBe('checkbox')
    expect(input.attributes('data-size')).toBeUndefined()
    expect(input.attributes('data-tone')).toBeUndefined()
  })

  it('sets visual hooks and forwards mixed state', async () => {
    const wrapper = mount(GhostCheckbox, {
      props: {
        indeterminate: true,
        size: 'lg',
        tone: 'danger',
      },
    })
    const input = wrapper.get('input')

    expect(input.attributes('data-size')).toBe('lg')
    expect(input.attributes('data-tone')).toBe('danger')
    expect(input.attributes('data-state')).toBe('indeterminate')
    await nextTick()
    expect((input.element as HTMLInputElement).indeterminate).toBe(true)
  })

  it('stays uncontrolled when modelValue is omitted', async () => {
    const wrapper = mount(GhostCheckbox)
    const input = wrapper.get('input').element as HTMLInputElement

    await wrapper.get('input').setValue(true)

    expect(input.checked).toBe(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })

  it('exposes the inner native checkbox', () => {
    const wrapper = mount(GhostCheckbox, { attachTo: document.body })
    const exposed = wrapper.vm as unknown as GhostCheckboxExposed

    exposed.focus()
    expect(exposed.element).toBe(wrapper.get('input').element)
    expect(document.activeElement).toBe(exposed.element)
    wrapper.unmount()
  })
})
