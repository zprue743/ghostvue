import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import {
  CalendarDate,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  type GhostDatePickerInputExposed,
  type GhostDatePickerPartExposed,
  type GhostDatePickerValue,
} from '../../packages/themes/src/index'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('themed GhostDatePicker', () => {
  it('forwards v-model, refs, data-themed, and consumer class/style', async () => {
    const value = ref<GhostDatePickerValue>(null)
    const input = ref<GhostDatePickerInputExposed | null>(null)
    const trigger = ref<GhostDatePickerPartExposed | null>(null)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostDatePicker,
            {
              modelValue: value.value,
              'onUpdate:modelValue': (next: GhostDatePickerValue) => {
                value.value = next
              },
              name: 'due',
              defaultOpen: true,
              today: new CalendarDate(2026, 11, 17),
            },
            () => [
              h(GhostDatePickerInput, {
                ref: input,
                'aria-label': 'Due',
                class: 'mine',
                style: { color: 'red' },
              }),
              h(GhostDatePickerTrigger, { ref: trigger }),
              h(GhostDatePickerContent, { class: 'panel' }),
            ],
          ),
      }),
      { attachTo: document.body },
    )
    await nextTick()
    const element = wrapper.get('input[type="text"]')
    expect(input.value?.element).toBe(element.element)
    expect(trigger.value?.element).toBe(
      wrapper.get('[data-part="trigger"]').element,
    )
    expect(element.attributes('data-themed')).toBe('')
    expect(element.classes()).toContain('mine')
    expect(element.attributes('style')).toContain('color: red')
    expect(wrapper.find('.ghost-themed-scope').exists()).toBe(true)

    const content = document.querySelector('[role="dialog"]')
    expect(content?.hasAttribute('data-themed')).toBe(true)
    expect(content?.classList.contains('panel')).toBe(true)
    // Calendar parts sit inside a recipe scope so the portaled grid is themed.
    expect(
      content?.querySelector('.ghost-themed-scope [role="grid"]'),
    ).not.toBeNull()
    // The default calendar uses themed nav parts: chevron icons, same names.
    const prev = content?.querySelector('[data-part="prev"]')
    expect(prev?.getAttribute('aria-label')).toBe('Previous month')
    expect(prev?.hasAttribute('data-themed')).toBe(true)
    expect(
      prev?.querySelector('[data-part="icon"][aria-hidden="true"]'),
    ).not.toBeNull()

    document
      .querySelector<HTMLElement>('[data-ghost-calendar-date="2026-11-19"]')
      ?.click()
    await nextTick()
    expect(value.value).toEqual(new CalendarDate(2026, 11, 19))
    wrapper.unmount()
  })
})
