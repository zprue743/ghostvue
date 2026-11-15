import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostCombobox from './GhostCombobox.vue'
import GhostComboboxContent from './GhostComboboxContent.vue'
import GhostComboboxEmpty from './GhostComboboxEmpty.vue'
import GhostComboboxInput from './GhostComboboxInput.vue'
import GhostComboboxOption from './GhostComboboxOption.vue'
import { waitForFormResetDeferral } from './form-reset'
import { useGhostComboboxAsyncSearch } from './use-ghost-combobox'

const attached: ReturnType<typeof mount>[] = []

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function comboboxFixture(extra?: Record<string, unknown>) {
  return defineComponent({
    setup() {
      const value = ref<string | undefined>('b')
      return () =>
        h(
          GhostCombobox,
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
              h(GhostComboboxInput, { 'data-testid': 'combobox-input' }),
              h(GhostComboboxContent, { portal: false }, () => [
                h(
                  GhostComboboxOption,
                  { value: 'a', textValue: 'Apple' },
                  () => 'Apple',
                ),
                h(
                  GhostComboboxOption,
                  { value: 'b', textValue: 'Banana' },
                  () => 'Banana',
                ),
                h(
                  GhostComboboxOption,
                  { value: 'c', disabled: true, textValue: 'Cherry' },
                  () => 'Cherry',
                ),
              ]),
              h(GhostComboboxEmpty, null, () => 'No results'),
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
})

describe('GhostCombobox', () => {
  it('selects a single value with keyboard highlight and Enter', async () => {
    const wrapper = mountAttached(comboboxFixture())
    const input = wrapper.get('[data-part="input"]')
    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-expanded')).toBe('false')

    input.element.focus()
    input.element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()

    expect(input.attributes('aria-expanded')).toBe('true')
    input.element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()

    input.element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()
    await nextTick()

    expect(input.attributes('aria-expanded')).toBe('false')
    expect((input.element as HTMLInputElement).value).toBe('Apple')
    const formInput = wrapper.get('input.ghost-visually-hidden')
    expect(formInput.attributes('name')).toBe('fruit')
    expect((formInput.element as HTMLInputElement).value).toBe('a')
  })

  it('emits search with a monotonic requestId on input', async () => {
    const onSearch = vi.fn()
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCombobox,
              { onSearch },
              {
                default: () => [
                  h(GhostComboboxInput),
                  h(GhostComboboxContent, { portal: false }, () =>
                    h(
                      GhostComboboxOption,
                      { value: 'a', textValue: 'Apple' },
                      () => 'Apple',
                    ),
                  ),
                ],
              },
            )
        },
      }),
    )

    const input = wrapper.get('input')
    await input.setValue('ap')
    await flushPromises()

    expect(onSearch).toHaveBeenCalled()
    const last = onSearch.mock.calls.at(-1)?.[0] as {
      query: string
      requestId: number
    }
    expect(last.query).toBe('ap')
    expect(typeof last.requestId).toBe('number')
    expect(last.requestId).toBeGreaterThan(0)
  })

  it('toggles membership when multiple is enabled', async () => {
    const value = ref<string[]>([])
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCombobox,
              {
                multiple: true,
                modelValue: value.value,
                'onUpdate:modelValue': (next: string | string[] | undefined) => {
                  value.value = Array.isArray(next) ? next : []
                },
              },
              {
                default: () => [
                  h(GhostComboboxInput),
                  h(GhostComboboxContent, { portal: false }, () => [
                    h(
                      GhostComboboxOption,
                      { value: 'a', textValue: 'Apple' },
                      () => 'Apple',
                    ),
                    h(
                      GhostComboboxOption,
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

    await wrapper.get('[data-value="a"]').trigger('click')
    await flushPromises()
    expect(value.value).toEqual(['a'])

    await wrapper.get('[data-value="a"]').trigger('click')
    await flushPromises()
    expect(value.value).toEqual([])
  })

  it('useGhostComboboxAsyncSearch discards stale request ids', () => {
    const { nextRequestId, isLatest } = useGhostComboboxAsyncSearch()
    const first = nextRequestId()
    const second = nextRequestId()
    expect(isLatest(first)).toBe(false)
    expect(isLatest(second)).toBe(true)
    expect(nextRequestId()).toBeGreaterThan(second)
  })

  it('shows empty results when open with no options and hides while loading', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCombobox,
              { loading: true, open: true },
              {
                default: () => [
                  h(GhostComboboxInput),
                  h(GhostComboboxContent, { portal: false }),
                  h(GhostComboboxEmpty, null, () => 'No results'),
                ],
              },
            )
        },
      }),
    )

    const empty = wrapper.get('[data-part="empty"]')
    expect(empty.isVisible()).toBe(false)

    wrapper.unmount()
    attached.pop()

    const openWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCombobox,
              { open: true },
              {
                default: () => [
                  h(GhostComboboxInput),
                  h(GhostComboboxContent, { portal: false }),
                  h(GhostComboboxEmpty, null, () => 'No results'),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    expect(openWrapper.get('[data-part="empty"]').isVisible()).toBe(true)
    expect(openWrapper.text()).toContain('No results')
  })

  it('uses native constraint validation when required and empty', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', null, [
              h(
                GhostCombobox,
                { name: 'fruit', required: true },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () =>
                      h(
                        GhostComboboxOption,
                        { value: 'a', textValue: 'Apple' },
                        () => 'Apple',
                      ),
                    ),
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

  it('focuses the combobox input and marks invalid on failed submit', async () => {
    const onSubmit = vi.fn((event: Event) => {
      event.preventDefault()
    })
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', { onSubmit }, [
              h(
                GhostCombobox,
                { name: 'fruit', required: true },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () =>
                      h(
                        GhostComboboxOption,
                        { value: 'a', textValue: 'Apple' },
                        () => 'Apple',
                      ),
                    ),
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
    const input = wrapper.get('[data-part="input"]').element as HTMLElement
    const form = wrapper.get('form').element as HTMLFormElement
    form.requestSubmit()
    await flushPromises()
    await nextTick()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(input)
    expect(wrapper.get('[data-part="input"]').attributes('aria-invalid')).toBe(
      'true',
    )
  })

  it('restores defaultValue and defaultSearch on native form reset', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          const fruit = ref('b')
          return () =>
            h('form', null, [
              h(
                GhostCombobox,
                {
                  modelValue: fruit.value,
                  defaultValue: 'b',
                  defaultSearch: '',
                  name: 'fruit',
                  'onUpdate:modelValue': (next: string | undefined) => {
                    fruit.value = next ?? ''
                  },
                },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () => [
                      h(
                        GhostComboboxOption,
                        { value: 'a', textValue: 'Apple' },
                        () => 'Apple',
                      ),
                      h(
                        GhostComboboxOption,
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

    const input = wrapper.get('[data-part="input"]')
    await wrapper.get('[data-value="a"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(
      (wrapper.get('input.ghost-visually-hidden').element as HTMLInputElement)
        .value,
    ).toBe('a')
    expect((input.element as HTMLInputElement).value).toBe('Apple')

    const form = wrapper.get('form')
    await form.trigger('reset')
    await waitForFormResetDeferral()
    await nextTick()
    expect((input.element as HTMLInputElement).value).toBe('Banana')
  })

  it('closes on Escape and restores focus to the input', async () => {
    const wrapper = mountAttached(comboboxFixture())
    const input = wrapper.get('[data-part="input"]')
    input.element.focus()
    input.element.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()

    input.element.dispatchEvent(
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
    expect(document.activeElement).toBe(input.element)
  })
})