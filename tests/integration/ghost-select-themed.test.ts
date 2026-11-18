import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import {
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
  type GhostSelectExposed,
} from '../../packages/themes/src/index'

describe('themed GhostSelect', () => {
  it('exposes the inner root and marks themed trigger', () => {
    const selectRef = ref<GhostSelectExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostSelect,
            { ref: selectRef, defaultValue: 'a', name: 'fruit' },
            {
              default: () => [
                h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                h(GhostSelectContent, { portal: false }, () =>
                  h(GhostSelectOption, { value: 'a' }, () => 'Apple'),
                ),
              ],
            },
          ),
      }),
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes('data-themed')).toBe('')
    expect(selectRef.value?.element).toBeTruthy()
    wrapper.unmount()
  })

  it('forwards messages to the unstyled select for required validation', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostSelect,
            {
              name: 'fruit',
              required: true,
              messages: { required: 'Selecciona una fruta.' },
            },
            {
              default: () => [
                h(GhostSelectTrigger, { 'aria-label': 'Fruta' }, () =>
                  h(GhostSelectValue),
                ),
                h(GhostSelectContent, { portal: false }, () =>
                  h(GhostSelectOption, { value: 'a' }, () => 'Manzana'),
                ),
              ],
            },
          ),
      }),
    )

    await flushPromises()
    await nextTick()
    const mirror = wrapper.get('input.ghost-visually-hidden')
      .element as HTMLInputElement
    expect(mirror.validationMessage).toBe('Selecciona una fruta.')
    wrapper.unmount()
  })
})
