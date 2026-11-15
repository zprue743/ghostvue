import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
  type GhostComboboxExposed,
} from '../../packages/themes/src/index'

describe('themed GhostCombobox', () => {
  it('exposes the combobox input and marks themed input', () => {
    const comboboxRef = ref<GhostComboboxExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostCombobox,
            { ref: comboboxRef, defaultValue: 'a', name: 'fruit' },
            {
              default: () => [
                h(GhostComboboxInput),
                h(GhostComboboxContent, { portal: false }, () =>
                  h(GhostComboboxOption, { value: 'a' }, () => 'Apple'),
                ),
              ],
            },
          ),
      }),
    )

    const input = wrapper.get('[data-part="input"]')
    expect(input.attributes('data-themed')).toBe('')
    expect(comboboxRef.value?.element).toBeTruthy()
    wrapper.unmount()
  })
})