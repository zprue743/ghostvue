import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GhostComboboxValue } from './ghost-combobox'
import GhostCombobox from './GhostCombobox.vue'
import GhostComboboxContent from './GhostComboboxContent.vue'
import GhostComboboxEmpty from './GhostComboboxEmpty.vue'
import GhostComboboxInput from './GhostComboboxInput.vue'
import GhostComboboxOption from './GhostComboboxOption.vue'
import GhostComboboxTrigger from './GhostComboboxTrigger.vue'
import GhostField from './GhostField.vue'
import GhostFieldControl from './GhostFieldControl.vue'
import GhostFieldLabel from './GhostFieldLabel.vue'
import { waitForFormResetDeferral } from './form-reset'
import {
  useGhostCombobox,
  useGhostComboboxAsyncSearch,
} from './use-ghost-combobox'
import { visuallyHiddenStyle } from './use-ghost-visually-hidden'

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
            'onUpdate:modelValue': (next: GhostComboboxValue) => {
              if (typeof next === 'string' || next === undefined) {
                value.value = next
              }
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
    const inputEl = input.element as HTMLInputElement
    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-expanded')).toBe('false')

    inputEl.focus()
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
                'onUpdate:modelValue': (
                  next: string | string[] | undefined,
                ) => {
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

  it('useGhostComboboxAsyncSearch tracks root search requestIds', () => {
    const { begin, isLatest } = useGhostComboboxAsyncSearch()
    begin(1)
    expect(isLatest(1)).toBe(true)
    begin(2)
    expect(isLatest(1)).toBe(false)
    expect(isLatest(2)).toBe(true)
  })

  it('ignores stale async search results for options and loading', async () => {
    const loading = ref(false)
    const options = ref<string[]>(['apple', 'banana', 'orange'])
    const { begin, isLatest } = useGhostComboboxAsyncSearch()
    const pending: { requestId: number; resolve: () => void }[] = []

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          async function onSearch(payload: {
            query: string
            requestId: number
          }) {
            const { requestId } = payload
            begin(requestId)
            loading.value = true
            await new Promise<void>((resolve) => {
              pending.push({ requestId, resolve })
            })
            if (!isLatest(requestId)) {
              return
            }
            options.value =
              payload.query.length > 0
                ? ['apple', 'banana', 'orange', 'grape']
                : ['apple', 'banana', 'orange']
            loading.value = false
          }
          return () =>
            h(
              GhostCombobox,
              {
                loading: loading.value,
                open: true,
                onSearch,
              },
              {
                default: () => [
                  h(GhostComboboxInput),
                  h(GhostComboboxContent, { portal: false }, () =>
                    options.value.map((value) =>
                      h(
                        GhostComboboxOption,
                        { value, textValue: value },
                        () => value,
                      ),
                    ),
                  ),
                ],
              },
            )
        },
      }),
    )

    const input = wrapper.get('[data-part="input"]')
    await input.setValue('g')
    await flushPromises()
    expect(loading.value).toBe(true)
    await input.setValue('gr')
    await flushPromises()
    expect(loading.value).toBe(true)
    const slow = pending[0]
    const fast = pending[1]
    expect(slow).toBeDefined()
    expect(fast).toBeDefined()
    slow?.resolve()
    await flushPromises()
    await nextTick()
    expect(loading.value).toBe(true)
    expect(wrapper.findAll('[data-part="option"]').length).toBe(3)
    fast?.resolve()
    await flushPromises()
    await nextTick()
    expect(loading.value).toBe(false)
    expect(wrapper.findAll('[data-part="option"]').length).toBe(4)
  })

  it('announces loading once and then results without repeating loading per keystroke', async () => {
    const loading = ref(true)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCombobox,
              { loading: loading.value, open: true },
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

    const announcer = wrapper.get('[data-part="announcer"]')
    expect(announcer.text()).toBe('Loading results')
    const input = wrapper.get('[data-part="input"]')
    await input.setValue('a')
    await input.setValue('ap')
    await flushPromises()
    expect(announcer.text()).toBe('Loading results')

    loading.value = false
    await flushPromises()
    await nextTick()
    expect(announcer.text()).toBe('1 results available')
  })

  it('submits multi-select with one mirror input per value (comma-safe)', async () => {
    const onSubmit = vi.fn((event: Event) => {
      event.preventDefault()
      const form = event.target as HTMLFormElement
      const data = new FormData(form)
      const tags = data.getAll('tags')
      expect(tags).toEqual(['a,b', 'plain'])
    })
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          const value = ref<string[]>(['a,b', 'plain'])
          return () =>
            h('form', { onSubmit }, [
              h(
                GhostCombobox,
                {
                  name: 'tags',
                  multiple: true,
                  modelValue: value.value,
                  'onUpdate:modelValue': (next: GhostComboboxValue) => {
                    value.value = Array.isArray(next) ? next : []
                  },
                },
                {
                  default: () => [
                    h(GhostComboboxInput),
                    h(GhostComboboxContent, { portal: false }, () => [
                      h(
                        GhostComboboxOption,
                        { value: 'a,b', textValue: 'A, B' },
                        () => 'A, B',
                      ),
                      h(
                        GhostComboboxOption,
                        { value: 'plain', textValue: 'plain' },
                        () => 'plain',
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
    const mirrors = wrapper.findAll('input.ghost-visually-hidden')
    expect(mirrors.length).toBe(2)
    expect(
      mirrors.map((m) => (m.element as HTMLInputElement).value).sort(),
    ).toEqual(['a,b', 'plain'])
    await wrapper.get('form').trigger('submit')
    expect(onSubmit).toHaveBeenCalled()
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
    // While loading, an empty listbox stands with aria-busy.
    const busy = wrapper.get('[data-part="listbox"]')
    expect(busy.attributes('role')).toBe('listbox')
    expect(busy.attributes('aria-busy')).toBe('true')

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
    // Inside role="listbox" only options and groups may carry a role; the
    // root live region announces the empty result instead.
    expect(
      openWrapper.get('[data-part="empty"]').attributes('role'),
    ).toBeUndefined()
    expect(openWrapper.get('[data-part="announcer"]').text()).toBe(
      'No results available',
    )
    // A listbox must own options; with none it stays a plain popup that keeps
    // its id for aria-controls.
    const popup = openWrapper.get('[data-part="listbox"]')
    expect(popup.attributes('role')).toBeUndefined()
    expect(popup.attributes('aria-labelledby')).toBeUndefined()
    expect(
      openWrapper.get('[role="combobox"]').attributes('aria-controls'),
    ).toBe(popup.attributes('id'))
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
                  'onUpdate:modelValue': (next: GhostComboboxValue) => {
                    if (typeof next === 'string' || next === undefined) {
                      fruit.value = next ?? ''
                    }
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

  describe('IME composition', () => {
    function imeFixture(handlers: {
      onKeydown: (event: KeyboardEvent) => void
      onSearch: (payload: unknown) => void
      onModel: (next: GhostComboboxValue) => void
    }) {
      return defineComponent({
        setup() {
          // Uncontrolled so the test observes emitted model updates only.
          return () =>
            h(
              GhostCombobox,
              {
                'onUpdate:modelValue': handlers.onModel,
                onSearch: handlers.onSearch,
              },
              {
                default: () => [
                  h(GhostComboboxInput, { onKeydown: handlers.onKeydown }),
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
      })
    }

    function press(
      target: HTMLElement,
      key: string,
      init: KeyboardEventInit = {},
    ): KeyboardEvent {
      const event = new KeyboardEvent('keydown', {
        ...init,
        key,
        bubbles: true,
        cancelable: true,
      })
      target.dispatchEvent(event)
      return event
    }

    // `isComposing` is the standard signal; keyCode 229 without isComposing is
    // what WebKit reports for the keydown that confirms a composition after
    // compositionend has already fired.
    const signals: [string, KeyboardEventInit][] = [
      ['isComposing', { isComposing: true }],
      ['keyCode 229', { keyCode: 229 }],
    ]

    for (const [label, init] of signals) {
      it(`leaves composing keys to the input method (${label})`, async () => {
        const onKeydown = vi.fn()
        const onSearch = vi.fn()
        const onModel = vi.fn()
        const wrapper = mountAttached(
          imeFixture({ onKeydown, onSearch, onModel }),
        )
        const input = wrapper.get('[data-part="input"]')
        const inputEl = input.element as HTMLInputElement
        inputEl.focus()

        // Closed: composing ArrowDown/ArrowUp must not open the popup.
        for (const key of ['ArrowDown', 'ArrowUp']) {
          const event = press(inputEl, key, init)
          await flushPromises()
          expect(event.defaultPrevented).toBe(false)
          expect(input.attributes('aria-expanded')).toBe('false')
        }

        // Open and highlight the first option with ordinary keys.
        press(inputEl, 'ArrowDown')
        await flushPromises()
        expect(input.attributes('aria-expanded')).toBe('true')
        const active = input.attributes('aria-activedescendant')
        expect(active).toBeTruthy()
        onKeydown.mockClear()

        for (const key of [
          'ArrowDown',
          'ArrowUp',
          'Home',
          'End',
          'Enter',
          'Escape',
          'a',
        ]) {
          const event = press(inputEl, key, init)
          await flushPromises()
          expect(event.defaultPrevented, key).toBe(false)
          expect(input.attributes('aria-expanded'), key).toBe('true')
          expect(input.attributes('aria-activedescendant'), key).toBe(active)
          expect(
            document
              .querySelector('[data-part="content"]')
              ?.hasAttribute('hidden'),
            key,
          ).toBe(false)
        }

        // Consumer handlers still observe every composing keydown.
        expect(onKeydown).toHaveBeenCalledTimes(7)
        expect(onModel).not.toHaveBeenCalled()
        expect(onSearch).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(inputEl)

        // After compositionend, ordinary keys resume combobox behavior.
        press(inputEl, 'ArrowDown')
        await flushPromises()
        expect(input.attributes('aria-activedescendant')).not.toBe(active)
        const enter = press(inputEl, 'Enter')
        await flushPromises()
        expect(enter.defaultPrevented).toBe(true)
        expect(onModel).toHaveBeenLastCalledWith('b')
        expect(input.attributes('aria-expanded')).toBe('false')

        press(inputEl, 'ArrowDown')
        await flushPromises()
        expect(input.attributes('aria-expanded')).toBe('true')
        const escape = press(inputEl, 'Escape')
        await flushPromises()
        expect(escape.defaultPrevented).toBe(true)
        expect(input.attributes('aria-expanded')).toBe('false')
      })
    }
  })

  it('closes on Escape and restores focus to the input', async () => {
    const wrapper = mountAttached(comboboxFixture())
    const input = wrapper.get('[data-part="input"]')
    const inputEl = input.element as HTMLInputElement
    inputEl.focus()
    inputEl.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowDown',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()

    inputEl.dispatchEvent(
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

  it('visually hides form mirrors and the announcer inline without any consumer stylesheet while preserving FormData, external form, and required validation', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('div', [
              h('form', { id: 'ext-combobox-form' }),
              h(
                GhostCombobox,
                {
                  name: 'fruits',
                  form: 'ext-combobox-form',
                  multiple: true,
                  required: true,
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

    await flushPromises()
    await nextTick()

    const announcer = wrapper.get('[data-part="announcer"]')
      .element as HTMLElement
    expect(announcer.getAttribute('aria-live')).toBe('polite')
    expect(announcer.getAttribute('aria-atomic')).toBe('true')
    expect(announcer.style.position).toBe('absolute')
    expect(announcer.style.width).toBe('1px')
    expect(announcer.style.height).toBe('1px')
    expect(announcer.style.margin).toBe('-1px')
    expect(announcer.style.overflow).toBe('hidden')
    expect(announcer.style.whiteSpace).toBe('nowrap')
    expect(announcer.style.clipPath).toBe('inset(50%)')

    const initialMirror = wrapper.get('input.ghost-visually-hidden')
      .element as HTMLInputElement
    expect(initialMirror.type).toBe('text')
    expect(initialMirror.getAttribute('form')).toBe('ext-combobox-form')
    expect(initialMirror.style.position).toBe('absolute')
    expect(initialMirror.style.width).toBe('1px')
    expect(initialMirror.style.height).toBe('1px')
    expect(initialMirror.style.overflow).toBe('hidden')
    expect(initialMirror.style.clipPath).toBe('inset(50%)')

    const form = wrapper.get('#ext-combobox-form').element as HTMLFormElement
    expect(form.checkValidity()).toBe(false)

    await wrapper.get('[data-value="a"]').trigger('click')
    await wrapper.get('[data-value="b"]').trigger('click')
    await flushPromises()
    await nextTick()

    expect(form.checkValidity()).toBe(true)
    expect(new FormData(form).getAll('fruits')).toEqual(['a', 'b'])

    const mirrors = wrapper.findAll('input.ghost-visually-hidden')
    expect(mirrors).toHaveLength(2)
    for (const mirror of mirrors) {
      const el = mirror.element as HTMLInputElement
      expect(el.style.position).toBe('absolute')
      expect(el.style.width).toBe('1px')
      expect(el.style.height).toBe('1px')
    }
  })

  it('includes inline visually-hidden style in useGhostCombobox formMirrorInputs and liveRegionProps', () => {
    let api!: ReturnType<typeof useGhostCombobox>
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          api = useGhostCombobox({ name: 'fruit' })
          return () => h('div')
        },
      }),
    )
    expect(api.formMirrorInputs.value[0]?.style).toEqual(visuallyHiddenStyle)
    expect(api.liveRegionProps.value.style).toEqual(visuallyHiddenStyle)
    expect(api.liveRegionProps.value['data-part']).toBe('announcer')
    expect(api.liveRegionProps.value['aria-live']).toBe('polite')
    expect(api.liveRegionProps.value['aria-atomic']).toBe(true)
    wrapper.unmount()
  })

  it('supports reactive non-English messages for announcements, pluralization, and required validation', async () => {
    const loading = ref(true)
    const count = ref(1)
    const messages = ref({
      loading: 'Cargando resultados',
      empty: 'No hay resultados disponibles',
      results: (n: number) =>
        n === 1
          ? '1 resultado disponible'
          : `${String(n)} resultados disponibles`,
      required: 'Selecciona un valor.',
    })

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('form', [
              h(
                GhostCombobox,
                {
                  name: 'fruit',
                  required: true,
                  loading: loading.value,
                  defaultOpen: true,
                  messages: messages.value,
                },
                {
                  default: () => [
                    h(GhostComboboxInput, { 'aria-label': 'Fruta' }),
                    h(GhostComboboxContent, { portal: false }, () =>
                      Array.from({ length: count.value }, (_, index) =>
                        h(
                          GhostComboboxOption,
                          { key: index, value: `opt-${String(index)}` },
                          () => `Opción ${String(index)}`,
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

    await flushPromises()
    await nextTick()
    const announcer = wrapper.get('[data-part="announcer"]')
    expect(announcer.text()).toBe('Cargando resultados')
    expect(announcer.text()).not.toContain('Loading results')

    const mirror = wrapper.get('input.ghost-visually-hidden')
      .element as HTMLInputElement
    expect(mirror.checkValidity()).toBe(false)
    expect(mirror.validationMessage).toBe('Selecciona un valor.')
    expect(mirror.validationMessage).not.toBe('Select a value.')

    loading.value = false
    await flushPromises()
    await nextTick()
    expect(announcer.text()).toBe('1 resultado disponible')

    count.value = 3
    await flushPromises()
    await nextTick()
    expect(announcer.text()).toBe('3 resultados disponibles')

    count.value = 0
    await flushPromises()
    await nextTick()
    expect(announcer.text()).toBe('No hay resultados disponibles')

    messages.value = {
      ...messages.value,
      empty: 'Sin coincidencias',
      required: 'Campo obligatorio.',
    }
    await flushPromises()
    await nextTick()
    expect(announcer.text()).toBe('Sin coincidencias')
    expect(mirror.validationMessage).toBe('Campo obligatorio.')
  })

  it('points aria-controls on the input and trigger at the role="listbox" element', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostCombobox, null, {
              default: () => [
                h(GhostComboboxInput, { 'aria-label': 'Fruit' }),
                h(GhostComboboxTrigger, { 'aria-label': 'Show fruits' }),
                h(GhostComboboxContent, { portal: false }, () => [
                  h(GhostComboboxOption, { value: 'a' }, () => 'Apple'),
                ]),
              ],
            })
        },
      }),
    )
    await flushPromises()
    const listbox = wrapper.get('[role="listbox"]')
    const listboxId = listbox.attributes('id')
    expect(listboxId).toBeTruthy()
    // The content root is a presentational positioning wrapper, not the popup.
    expect(listboxId).not.toBe(
      wrapper.get('[data-part="content"]').attributes('id'),
    )
    expect(wrapper.get('[role="combobox"]').attributes('aria-controls')).toBe(
      listboxId,
    )
    expect(
      wrapper.get('[data-part="trigger"]').attributes('aria-controls'),
    ).toBe(listboxId)
  })

  it('keeps GhostField invalid and required state spread onto the input', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostField,
              { invalid: true, required: true },
              {
                default: () => [
                  h(GhostFieldLabel, null, () => 'Assignee'),
                  h(GhostFieldControl, null, {
                    default: (field: Record<string, unknown>) =>
                      h(GhostCombobox, null, {
                        default: () => [
                          h(GhostComboboxInput, field),
                          h(GhostComboboxContent, { portal: false }, () => [
                            h(GhostComboboxOption, { value: 'a' }, () => 'Ada'),
                          ]),
                        ],
                      }),
                  }),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    const input = wrapper.get('[role="combobox"]')
    // The root's own `invalid` / `required` are false; the field's state wins.
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-required')).toBe('true')
    // The raw slot key is not rendered as an attribute.
    expect(input.attributes('invalid')).toBeUndefined()
  })

  it('leaves aria-invalid unset for a valid field and honours the root invalid prop', () => {
    const valid = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostCombobox, null, {
              default: () => [
                h(GhostComboboxInput, {
                  'aria-label': 'Fruit',
                  invalid: false,
                  'aria-invalid': 'false',
                }),
              ],
            })
        },
      }),
    )
    expect(
      valid.get('[role="combobox"]').attributes('aria-invalid'),
    ).toBeUndefined()

    const invalidRoot = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCombobox,
              { invalid: true },
              {
                default: () => [
                  h(GhostComboboxInput, {
                    'aria-label': 'Fruit',
                    invalid: false,
                  }),
                ],
              },
            )
        },
      }),
    )
    expect(
      invalidRoot.get('[role="combobox"]').attributes('aria-invalid'),
    ).toBe('true')
  })

  it('renders a placeholder set on the input when the root has none', () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () => [
            h(GhostCombobox, null, {
              default: () => [
                h(GhostComboboxInput, {
                  'aria-label': 'Person',
                  placeholder: 'Search people',
                }),
              ],
            }),
            h(
              GhostCombobox,
              { placeholder: 'From root' },
              {
                default: () => [
                  h(GhostComboboxInput, {
                    'aria-label': 'Team',
                    placeholder: 'From input',
                  }),
                ],
              },
            ),
          ]
        },
      }),
    )
    const [person, team] = wrapper.findAll('[role="combobox"]')
    expect(person?.attributes('placeholder')).toBe('Search people')
    // The root prop keeps precedence when both are set.
    expect(team?.attributes('placeholder')).toBe('From root')
  })

  it('clears a controlled single selection when the parent sets undefined', async () => {
    const value = ref<string | undefined>(undefined)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostCombobox,
              {
                modelValue: value.value,
                'onUpdate:modelValue': (next: GhostComboboxValue) => {
                  if (typeof next === 'string' || next === undefined) {
                    value.value = next
                  }
                },
                name: 'fruit',
              },
              {
                default: () => [
                  h(GhostComboboxInput, { 'aria-label': 'Fruit' }),
                  h(GhostComboboxContent, { portal: false }, () => [
                    h(
                      GhostComboboxOption,
                      { value: 'a', textValue: 'Apple' },
                      () => 'Apple',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    const input = wrapper.get('[role="combobox"]')
    const inputEl = input.element as HTMLInputElement
    inputEl.focus()
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(value.value).toBe('a')
    expect(inputEl.value).toBe('Apple')

    value.value = undefined
    await flushPromises()
    const mirror = wrapper.get('input[name="fruit"]')
      .element as HTMLInputElement
    expect(mirror.value).toBe('')
    expect(wrapper.get('[role="option"]').attributes('aria-selected')).toBe(
      'false',
    )
  })
})
