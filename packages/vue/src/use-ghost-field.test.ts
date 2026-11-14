import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import { useGhostField } from './use-ghost-field'

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

describe('useGhostField', () => {
  it('generates stable ids and reflects disabled, invalid, and required', () => {
    const { result, wrapper } = mountComposable(() =>
      useGhostField({
        id: () => 'custom-control',
        disabled: () => true,
        invalid: () => true,
        required: () => true,
      }),
    )
    expect(result.controlId.value).toBe('custom-control')
    expect(result.labelId.value).toMatch(/^ghost-field-label-/)
    expect(result.descriptionId.value).toMatch(/^ghost-field-description-/)
    expect(result.errorId.value).toMatch(/^ghost-field-error-/)
    expect(result.disabled.value).toBe(true)
    expect(result.invalid.value).toBe(true)
    expect(result.required.value).toBe(true)
    wrapper.unmount()
  })
})
