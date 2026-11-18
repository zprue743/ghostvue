import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

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

  it('forwards messages to the unstyled combobox for announcements and validation', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostCombobox,
            {
              name: 'fruit',
              required: true,
              defaultOpen: true,
              messages: {
                empty: 'Sin resultados',
                required: 'Elige una fruta.',
              },
            },
            {
              default: () => [
                h(GhostComboboxInput, { 'aria-label': 'Fruta' }),
                h(GhostComboboxContent, { portal: false }, () => []),
              ],
            },
          ),
      }),
    )

    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-part="announcer"]').text()).toBe('Sin resultados')
    const mirror = wrapper.get('input.ghost-visually-hidden')
      .element as HTMLInputElement
    expect(mirror.validationMessage).toBe('Elige una fruta.')
    wrapper.unmount()
  })
})
