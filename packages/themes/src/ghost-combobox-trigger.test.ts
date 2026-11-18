import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
  GhostComboboxTrigger,
  type GhostComboboxTriggerExposed,
} from './index'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  while (attached.length > 0) attached.pop()?.unmount()
  document.body.innerHTML = ''
})

describe('ghost-combobox-trigger theme wrapper', () => {
  it('applies themed attributes, merges consumer classes, and forwards attrs and slots', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(GhostCombobox, null, {
            default: () => [
              h(GhostComboboxInput, { 'aria-label': 'Fruit' }),
              h(
                GhostComboboxTrigger,
                {
                  id: 'fruit-trigger',
                  class: ['custom-trigger', { 'is-active': true }],
                  'aria-label': 'Toggle fruit options',
                },
                () => 'Open',
              ),
              h(GhostComboboxContent, { portal: false }, () => [
                h(GhostComboboxOption, { value: 'apple' }, () => 'Apple'),
              ]),
            ],
          }),
      }),
    )
    attached.push(wrapper)

    const trigger = wrapper.get('#fruit-trigger')
    expect(trigger.element.tagName).toBe('BUTTON')
    expect(trigger.attributes('type')).toBe('button')
    expect(trigger.attributes('data-part')).toBe('trigger')
    expect(trigger.attributes('data-themed')).toBe('')
    expect(trigger.attributes('aria-label')).toBe('Toggle fruit options')
    expect(trigger.text()).toBe('Open')
    expect(trigger.classes()).toContain('ghost-combobox-trigger')
    expect(trigger.classes()).toContain('custom-trigger')
    expect(trigger.classes()).toContain('is-active')
  })

  it('exposes element, focus, and blur and returns null after unmount', () => {
    const triggerRef = ref<GhostComboboxTriggerExposed | null>(null)
    const show = ref(true)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          show.value
            ? h(GhostCombobox, null, {
                default: () => [
                  h(GhostComboboxInput, { 'aria-label': 'Fruit' }),
                  h(
                    GhostComboboxTrigger,
                    { ref: triggerRef, 'aria-label': 'Toggle' },
                    () => 'Open',
                  ),
                ],
              })
            : null,
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    const button = wrapper.get('[data-part="trigger"]').element
    expect(triggerRef.value?.element).toBe(button)

    triggerRef.value?.focus({ preventScroll: true })
    expect(document.activeElement).toBe(button)

    triggerRef.value?.blur()
    expect(document.activeElement).not.toBe(button)

    show.value = false
    return nextTick().then(() => {
      expect(triggerRef.value).toBeNull()
    })
  })

  it('forwards disabled and as props and toggles combobox open state on click', async () => {
    const open = ref(false)
    const disabled = ref(true)
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(
            GhostCombobox,
            {
              open: open.value,
              'onUpdate:open': (next: boolean) => {
                open.value = next
              },
            },
            {
              default: () => [
                h(GhostComboboxInput, { 'aria-label': 'Fruit' }),
                h(
                  GhostComboboxTrigger,
                  {
                    as: 'span',
                    disabled: disabled.value,
                    tabindex: 0,
                  },
                  () => 'Toggle',
                ),
                h(GhostComboboxContent, { portal: false }, () => [
                  h(GhostComboboxOption, { value: 'apple' }, () => 'Apple'),
                ]),
              ],
            },
          ),
      }),
    )
    attached.push(wrapper)

    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.element.tagName).toBe('SPAN')
    expect(trigger.attributes('aria-disabled')).toBe('true')
    expect(trigger.attributes('data-state')).toBe('closed')

    await trigger.trigger('click')
    expect(open.value).toBe(false)

    disabled.value = false
    await nextTick()
    expect(trigger.attributes('aria-disabled')).toBeUndefined()

    await trigger.trigger('click')
    expect(open.value).toBe(true)
    expect(trigger.attributes('data-state')).toBe('open')
  })
})
