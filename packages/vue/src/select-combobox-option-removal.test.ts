import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GhostComboboxValue } from './ghost-combobox'
import GhostCombobox from './GhostCombobox.vue'
import GhostComboboxContent from './GhostComboboxContent.vue'
import GhostComboboxInput from './GhostComboboxInput.vue'
import GhostComboboxOption from './GhostComboboxOption.vue'
import GhostSelect from './GhostSelect.vue'
import GhostSelectContent from './GhostSelectContent.vue'
import GhostSelectOption from './GhostSelectOption.vue'
import GhostSelectTrigger from './GhostSelectTrigger.vue'
import GhostSelectValue from './GhostSelectValue.vue'
import { waitForFormResetDeferral } from './form-reset'
import { useGhostComboboxAsyncSearch } from './use-ghost-combobox'

/*
 * GHO-163 regression suite: option unmounting (consumer filtering, async result
 * replacement, reordering, remounting) is registry bookkeeping only. It must
 * never silently delete an uncontrolled selection, drop its cached label, or
 * emit an unsolicited `update:modelValue`.
 */

const LABELS: Record<string, string> = {
  apple: 'Apple',
  banana: 'Banana',
  cherry: 'Cherry',
  grape: 'Grape',
}

function labelOf(value: string): string {
  return LABELS[value] ?? value
}

const attached: ReturnType<typeof mount>[] = []

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
})

async function settle(): Promise<void> {
  await flushPromises()
  await nextTick()
  await flushPromises()
}

function formEntries(wrapper: ReturnType<typeof mount>, name: string) {
  return new FormData(wrapper.get('form').element).getAll(name)
}

function pressKey(element: Element, key: string): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
}

describe('GhostSelect option removal (uncontrolled)', () => {
  function selectFixture(onUpdate: (next: string | undefined) => void) {
    const options = ref<string[]>(['apple', 'banana', 'cherry'])
    const component = defineComponent({
      setup() {
        return () =>
          h('form', null, [
            h(
              GhostSelect,
              {
                defaultValue: 'apple',
                name: 'fruit',
                'onUpdate:modelValue': onUpdate,
              },
              {
                default: () => [
                  h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                  h(GhostSelectContent, { portal: false }, () =>
                    options.value.map((value) =>
                      h(
                        GhostSelectOption,
                        { key: value, value, textValue: labelOf(value) },
                        () => labelOf(value),
                      ),
                    ),
                  ),
                ],
              },
            ),
          ])
      },
    })
    return { options, component }
  }

  it('keeps value, label, and FormData through filtering, reorder, and remount', async () => {
    const onUpdate = vi.fn()
    const { options, component } = selectFixture(onUpdate)
    const wrapper = mountAttached(component)
    await settle()

    const valueText = () => wrapper.get('[data-part="value"]').text()
    expect(valueText()).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    // Filter the selected option out.
    options.value = ['banana', 'cherry']
    await settle()
    expect(wrapper.find('[data-value="apple"]').exists()).toBe(false)
    expect(valueText()).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    // Remove every option.
    options.value = []
    await settle()
    expect(valueText()).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    // Remount in a different order.
    options.value = ['cherry', 'apple', 'banana']
    await settle()
    expect(
      wrapper.find('[data-value="apple"]').attributes('aria-selected'),
    ).toBe('true')
    expect(valueText()).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('still emits for user selection and restores defaultValue on reset after removal', async () => {
    const onUpdate = vi.fn()
    const { options, component } = selectFixture(onUpdate)
    const wrapper = mountAttached(component)
    await settle()

    await wrapper.get('[data-part="trigger"]').trigger('click')
    await settle()
    await wrapper.get('[data-value="banana"]').trigger('click')
    await settle()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenLastCalledWith('banana')

    options.value = ['apple', 'cherry']
    await settle()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Banana')
    expect(formEntries(wrapper, 'fruit')).toEqual(['banana'])
    expect(onUpdate).toHaveBeenCalledTimes(1)

    await wrapper.get('form').trigger('reset')
    await waitForFormResetDeferral()
    await settle()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])
  })

  it('keeps a controlled value when the parent ignores updates and the option unmounts', async () => {
    const onUpdate = vi.fn()
    const options = ref<string[]>(['apple', 'banana'])
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', null, [
              h(
                GhostSelect,
                {
                  modelValue: 'apple',
                  name: 'fruit',
                  'onUpdate:modelValue': onUpdate,
                },
                {
                  default: () => [
                    h(GhostSelectTrigger, null, () => h(GhostSelectValue)),
                    h(GhostSelectContent, { portal: false }, () =>
                      options.value.map((value) =>
                        h(
                          GhostSelectOption,
                          { key: value, value, textValue: labelOf(value) },
                          () => labelOf(value),
                        ),
                      ),
                    ),
                  ],
                },
              ),
            ])
        },
      }),
    )
    await settle()

    // A rejected user change leaves the controlled value in place.
    await wrapper.get('[data-part="trigger"]').trigger('click')
    await settle()
    await wrapper.get('[data-value="banana"]').trigger('click')
    await settle()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    options.value = ['banana']
    await settle()
    expect(wrapper.get('[data-part="value"]').text()).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })
})

describe('GhostCombobox option removal (uncontrolled)', () => {
  it('keeps a single value and its label through filtering, reorder, and remount', async () => {
    const onUpdate = vi.fn()
    const options = ref<string[]>(['apple', 'banana', 'cherry'])
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', null, [
              h(
                GhostCombobox,
                {
                  defaultValue: 'apple',
                  name: 'fruit',
                  'onUpdate:modelValue': onUpdate,
                },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () =>
                      options.value.map((value) =>
                        h(
                          GhostComboboxOption,
                          { key: value, value, textValue: labelOf(value) },
                          () => labelOf(value),
                        ),
                      ),
                    ),
                  ],
                },
              ),
            ])
        },
      }),
    )
    await settle()

    const input = () =>
      wrapper.get('[data-part="input"]').element as HTMLInputElement
    expect(input().value).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    options.value = ['banana', 'cherry']
    await settle()
    expect(input().value).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    options.value = []
    await settle()
    expect(input().value).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    options.value = ['cherry', 'banana', 'apple']
    await settle()
    expect(
      wrapper.get('[data-value="apple"]').attributes('aria-selected'),
    ).toBe('true')
    expect(input().value).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('keeps multiple values through filtering and reorder; explicit toggling and reset still work', async () => {
    const onUpdate = vi.fn()
    const options = ref<string[]>(['apple', 'banana', 'cherry'])
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', null, [
              h(
                GhostCombobox,
                {
                  multiple: true,
                  defaultValue: ['apple', 'banana'],
                  name: 'tags',
                  'onUpdate:modelValue': onUpdate,
                },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () =>
                      options.value.map((value) =>
                        h(
                          GhostComboboxOption,
                          { key: value, value, textValue: labelOf(value) },
                          () => labelOf(value),
                        ),
                      ),
                    ),
                  ],
                },
              ),
            ])
        },
      }),
    )
    await settle()
    expect(formEntries(wrapper, 'tags')).toEqual(['apple', 'banana'])

    options.value = ['cherry']
    await settle()
    expect(formEntries(wrapper, 'tags')).toEqual(['apple', 'banana'])

    options.value = ['banana', 'cherry', 'apple']
    await settle()
    expect(formEntries(wrapper, 'tags')).toEqual(['apple', 'banana'])
    expect(
      wrapper.get('[data-value="apple"]').attributes('aria-selected'),
    ).toBe('true')
    expect(
      wrapper.get('[data-value="banana"]').attributes('aria-selected'),
    ).toBe('true')
    expect(onUpdate).not.toHaveBeenCalled()

    // Explicit user clearing still removes the value and emits.
    await wrapper.get('[data-value="apple"]').trigger('click')
    await settle()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenLastCalledWith(['banana'])
    expect(formEntries(wrapper, 'tags')).toEqual(['banana'])

    // Removing the remaining selected option does not delete it.
    options.value = ['apple', 'cherry']
    await settle()
    expect(formEntries(wrapper, 'tags')).toEqual(['banana'])
    expect(onUpdate).toHaveBeenCalledTimes(1)

    await wrapper.get('form').trigger('reset')
    await waitForFormResetDeferral()
    await settle()
    expect(formEntries(wrapper, 'tags')).toEqual(['apple', 'banana'])
  })

  it('keeps the selection and cached label across out-of-order async result replacement', async () => {
    const onUpdate = vi.fn()
    const loading = ref(false)
    const results = ref<string[]>(['apple', 'banana'])
    const { begin, isLatest } = useGhostComboboxAsyncSearch()
    const pending: { query: string; resolve: () => void }[] = []

    function resultsFor(query: string): string[] {
      return Object.keys(LABELS).filter((value) =>
        value.startsWith(query.toLowerCase()),
      )
    }

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          async function onSearch(payload: {
            query: string
            requestId: number
          }) {
            begin(payload.requestId)
            loading.value = true
            await new Promise<void>((resolve) => {
              pending.push({ query: payload.query, resolve })
            })
            if (!isLatest(payload.requestId)) {
              return
            }
            results.value = resultsFor(payload.query)
            loading.value = false
          }
          return () =>
            h('form', null, [
              h(
                GhostCombobox,
                {
                  name: 'fruit',
                  loading: loading.value,
                  onSearch,
                  'onUpdate:modelValue': (next: GhostComboboxValue) => {
                    onUpdate(next)
                  },
                },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () =>
                      results.value.map((value) =>
                        h(
                          GhostComboboxOption,
                          { key: value, value, textValue: labelOf(value) },
                          () => labelOf(value),
                        ),
                      ),
                    ),
                  ],
                },
              ),
            ])
        },
      }),
    )
    await settle()

    const inputWrapper = wrapper.get('[data-part="input"]')
    const input = inputWrapper.element as HTMLInputElement

    // User picks apple.
    await wrapper.get('[data-value="apple"]').trigger('click')
    await settle()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenLastCalledWith('apple')
    expect(input.value).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    // Two searches whose results exclude apple; they resolve out of order.
    await inputWrapper.setValue('b')
    await settle()
    await inputWrapper.setValue('g')
    await settle()
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])
    const [slow, fast] = pending
    expect(slow?.query).toBe('b')
    expect(fast?.query).toBe('g')

    fast?.resolve()
    await settle()
    expect(results.value).toEqual(['grape'])
    expect(wrapper.find('[data-value="apple"]').exists()).toBe(false)
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    slow?.resolve()
    await settle()
    expect(results.value).toEqual(['grape'])
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    // Closing without choosing restores the cached label of the kept value.
    pressKey(input, 'Escape')
    await settle()
    expect(inputWrapper.attributes('aria-expanded')).toBe('false')
    expect(input.value).toBe('Apple')
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })

  it('keeps a controlled value when the parent rejects a change and the option unmounts', async () => {
    const onUpdate = vi.fn()
    const options = ref<string[]>(['apple', 'banana'])
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', null, [
              h(
                GhostCombobox,
                {
                  modelValue: 'apple',
                  name: 'fruit',
                  'onUpdate:modelValue': onUpdate,
                },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () =>
                      options.value.map((value) =>
                        h(
                          GhostComboboxOption,
                          { key: value, value, textValue: labelOf(value) },
                          () => labelOf(value),
                        ),
                      ),
                    ),
                  ],
                },
              ),
            ])
        },
      }),
    )
    await settle()

    await wrapper.get('[data-value="banana"]').trigger('click')
    await settle()
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])

    options.value = ['banana']
    await settle()
    expect(formEntries(wrapper, 'fruit')).toEqual(['apple'])
    expect(
      (wrapper.get('[data-part="input"]').element as HTMLInputElement).value,
    ).toBe('Apple')
    expect(onUpdate).toHaveBeenCalledTimes(1)
  })
})
