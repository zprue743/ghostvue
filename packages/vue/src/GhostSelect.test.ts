import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostSelect from './GhostSelect.vue'
import GhostSelectContent from './GhostSelectContent.vue'
import GhostSelectOption from './GhostSelectOption.vue'
import GhostSelectTrigger from './GhostSelectTrigger.vue'
import GhostSelectValue from './GhostSelectValue.vue'
import { waitForFormResetDeferral } from './form-reset'

let computePositionOverride:
  | ((
      ...args: Parameters<typeof FloatingDom.computePosition>
    ) => ReturnType<typeof FloatingDom.computePosition>)
  | null = null

vi.mock('@floating-ui/dom', async () => {
  const actual = await vi.importActual<typeof FloatingDom>('@floating-ui/dom')
  return {
    ...actual,
    computePosition: (
      reference: Parameters<typeof actual.computePosition>[0],
      floating: Parameters<typeof actual.computePosition>[1],
      config?: Parameters<typeof actual.computePosition>[2],
    ) => {
      if (computePositionOverride) {
        return computePositionOverride(reference, floating, config)
      }
      return actual.computePosition(reference, floating, config)
    },
  }
})

const attached: ReturnType<typeof mount>[] = []

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function selectFixture(extra?: Record<string, unknown>) {
  return defineComponent({
    setup() {
      const value = ref<string | undefined>('b')
      return () =>
        h(
          GhostSelect,
          {
            modelValue: value.value,
            'onUpdate:modelValue': (next: string | undefined) => {
              value.value = next
            },
            name: 'fruit',
            ...extra,
          },
          {
            default: () => [
              h(GhostSelectTrigger, { 'data-testid': 'select-trigger' }, () =>
                h(GhostSelectValue),
              ),
              h(GhostSelectContent, { portal: false }, () => [
                h(
                  GhostSelectOption,
                  { value: 'a', textValue: 'Apple' },
                  () => 'Apple',
                ),
                h(
                  GhostSelectOption,
                  { value: 'b', textValue: 'Banana' },
                  () => 'Banana',
                ),
                h(
                  GhostSelectOption,
                  { value: 'c', disabled: true, textValue: 'Cherry' },
                  () => 'Cherry',
                ),
              ]),
            ],
          },
        )
    },
  })
}

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  computePositionOverride = null
})

describe('GhostSelect', () => {
  it('exposes combobox/listbox semantics and selects on click', async () => {
    const wrapper = mountAttached(selectFixture())
    const trigger = wrapper.get('[data-part="trigger"]')
    expect(trigger.attributes('role')).toBe('combobox')
    expect(trigger.attributes('aria-haspopup')).toBe('listbox')
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    await flushPromises()

    expect(trigger.attributes('aria-expanded')).toBe('true')
    const listbox = document.querySelector('[data-part="listbox"]')
    expect(listbox).not.toBeNull()
    expect(listbox?.getAttribute('role')).toBe('listbox')

    const apple = wrapper.get('[data-value="a"]')
    await apple.trigger('click')
    await flushPromises()

    expect(trigger.attributes('aria-expanded')).toBe('false')
    const closedContent = document.querySelector(
      '[data-part="content"][data-state="closed"]',
    )
    expect(closedContent).not.toBeNull()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Apple')
    const formInput = wrapper.get('input.ghost-visually-hidden')
    expect(formInput.attributes('name')).toBe('fruit')
    expect((formInput.element as HTMLInputElement).value).toBe('a')
  })

  it('keeps uncontrolled value and label after selecting and closing', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSelect,
              { defaultValue: 'b', name: 'fruit' },
              {
                default: () => [
                  h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                  h(GhostSelectContent, { portal: false }, () => [
                    h(
                      GhostSelectOption,
                      { value: 'a', textValue: 'Apple' },
                      () => 'Apple',
                    ),
                    h(
                      GhostSelectOption,
                      { value: 'b', textValue: 'Banana' },
                      () => 'Banana',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Banana')
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    await wrapper.get('[data-value="a"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Apple')
    expect(
      (wrapper.get('input.ghost-visually-hidden').element as HTMLInputElement)
        .value,
    ).toBe('a')
    expect(
      document.querySelector('[data-part="content"]')?.hasAttribute('hidden'),
    ).toBe(true)
  })

  it('shows defaultValue label while closed before opening', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSelect,
              { defaultValue: 'b' },
              {
                default: () => [
                  h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                  h(GhostSelectContent, { portal: false }, () => [
                    h(
                      GhostSelectOption,
                      { value: 'b', textValue: 'Banana' },
                      () => 'Banana',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Banana')
    expect(
      wrapper.get('[data-part="trigger"]').attributes('aria-expanded'),
    ).toBe('false')
  })

  it('keeps controlled value through open and close cycles', async () => {
    const value = ref('b')
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostSelect,
              {
                modelValue: value.value,
                'onUpdate:modelValue': (next: string | undefined) => {
                  value.value = next ?? ''
                },
              },
              {
                default: () => [
                  h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                  h(GhostSelectContent, { portal: false }, () => [
                    h(
                      GhostSelectOption,
                      { value: 'a', textValue: 'Apple' },
                      () => 'Apple',
                    ),
                    h(
                      GhostSelectOption,
                      { value: 'b', textValue: 'Banana' },
                      () => 'Banana',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    await trigger.trigger('click')
    await flushPromises()
    expect(value.value).toBe('b')
    expect(wrapper.get('[data-part="value"]').text()).toBe('Banana')
  })

  it('uses native constraint validation when required and empty', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', null, [
              h(
                GhostSelect,
                { name: 'fruit', required: true },
                {
                  default: () => [
                    h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                    h(GhostSelectContent, { portal: false }, () => [
                      h(
                        GhostSelectOption,
                        { value: 'a', textValue: 'Apple' },
                        () => 'Apple',
                      ),
                    ]),
                  ],
                },
              ),
            ])
        },
      }),
    )

    await flushPromises()
    await nextTick()
    const input = wrapper.get('input.ghost-visually-hidden')
      .element as HTMLInputElement
    expect(input.required).toBe(true)
    expect(input.value).toBe('')
    expect(input.checkValidity()).toBe(false)
    expect(input.validationMessage).toBe('Select a value.')
    const form = wrapper.get('form').element as HTMLFormElement
    expect(form.checkValidity()).toBe(false)
  })

  it('moves focus to the trigger and marks invalid on failed submit', async () => {
    const onSubmit = vi.fn((event: Event) => {
      event.preventDefault()
    })
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', { onSubmit }, [
              h(
                GhostSelect,
                { name: 'fruit', required: true },
                {
                  default: () => [
                    h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                    h(GhostSelectContent, { portal: false }, () => [
                      h(
                        GhostSelectOption,
                        { value: 'a', textValue: 'Apple' },
                        () => 'Apple',
                      ),
                    ]),
                  ],
                },
              ),
              h('button', { type: 'submit' }, 'Send'),
            ])
        },
      }),
    )

    await flushPromises()
    await nextTick()
    const trigger = wrapper.get('[data-part="trigger"]').element as HTMLElement
    const form = wrapper.get('form').element as HTMLFormElement
    form.requestSubmit()
    await flushPromises()
    await nextTick()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(trigger)
    expect(
      wrapper.get('[data-part="trigger"]').attributes('aria-invalid'),
    ).toBe('true')
  })

  it('restores defaultValue on native form reset', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          const fruit = ref('b')
          return () =>
            h('form', null, [
              h(
                GhostSelect,
                {
                  modelValue: fruit.value,
                  defaultValue: 'b',
                  name: 'fruit',
                  'onUpdate:modelValue': (next: string | undefined) => {
                    fruit.value = next ?? ''
                  },
                },
                {
                  default: () => [
                    h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                    h(GhostSelectContent, { portal: false }, () => [
                      h(
                        GhostSelectOption,
                        { value: 'a', textValue: 'Apple' },
                        () => 'Apple',
                      ),
                      h(
                        GhostSelectOption,
                        { value: 'b', textValue: 'Banana' },
                        () => 'Banana',
                      ),
                    ]),
                  ],
                },
              ),
            ])
        },
      }),
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()
    await wrapper.get('[data-value="a"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(
      (wrapper.get('input.ghost-visually-hidden').element as HTMLInputElement)
        .value,
    ).toBe('a')
    expect(wrapper.get('[data-part="value"]').text()).toBe('Apple')

    const form = wrapper.get('form')
    await form.trigger('reset')
    await waitForFormResetDeferral()
    await nextTick()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Banana')
  })

  it('typeahead focuses the next matching option', async () => {
    const wrapper = mountAttached(selectFixture())
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()

    const listbox = document.querySelector('[data-part="listbox"]')
    expect(listbox).toBeInstanceOf(HTMLElement)
    if (!(listbox instanceof HTMLElement)) {
      return
    }
    listbox.focus()
    listbox.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'c',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()
    // Cherry is disabled; typeahead should not select it
    expect(document.activeElement?.getAttribute('data-value')).not.toBe('c')
  })

  it('closes on Escape and restores focus to the trigger', async () => {
    const wrapper = mountAttached(selectFixture())
    const trigger = wrapper.get('[data-part="trigger"]')
    await trigger.trigger('click')
    await flushPromises()

    const listbox = document.querySelector('[data-part="listbox"]')
    expect(listbox).toBeInstanceOf(HTMLElement)
    if (!(listbox instanceof HTMLElement)) {
      return
    }
    listbox.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()
    expect(
      document.querySelector('[data-part="content"]')?.hasAttribute('hidden'),
    ).toBe(true)
    expect(document.activeElement).toBe(trigger.element)
  })
})
