import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GhostComboboxValue } from './ghost-combobox'
import GhostCombobox from './GhostCombobox.vue'
import GhostComboboxContent from './GhostComboboxContent.vue'
import GhostComboboxInput from './GhostComboboxInput.vue'
import GhostComboboxOption from './GhostComboboxOption.vue'
import GhostComboboxTrigger from './GhostComboboxTrigger.vue'

/*
 * GHO-166: focus leaving the complete widget (input, trigger, inline or
 * portaled content) requests close without restoring focus and clears the
 * transient search; internal moves and option pointer selection do not.
 */

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  document.body.innerHTML = ''
})

interface FixtureOptions {
  multiple?: boolean
  portal?: boolean
  /** Controlled `open` that ignores `update:open` (parent rejection). */
  rejectOpen?: boolean
  /** Controlled `search` that ignores `update:search` (parent rejection). */
  rejectSearch?: string
  initial?: GhostComboboxValue
}

function mountFixture(options: FixtureOptions = {}) {
  const onOpen = vi.fn<(open: boolean) => void>()
  const onSearchUpdate = vi.fn<(query: string) => void>()
  const onSearch = vi.fn<(payload: { query: string }) => void>()
  const onModel = vi.fn<(value: GhostComboboxValue) => void>()
  const Fixture = defineComponent({
    setup() {
      return () => [
        h('button', { type: 'button', 'data-testid': 'before' }, 'Before'),
        h(
          GhostCombobox,
          {
            // Uncontrolled selection so the fixture can start empty.
            defaultValue: options.initial,
            multiple: options.multiple ?? false,
            ...(options.rejectOpen ? { open: true } : {}),
            ...(options.rejectSearch === undefined
              ? {}
              : { search: options.rejectSearch }),
            'onUpdate:modelValue': (next: GhostComboboxValue) => {
              onModel(next)
            },
            'onUpdate:open': onOpen,
            'onUpdate:search': onSearchUpdate,
            onSearch,
          },
          {
            default: () => [
              h(GhostComboboxInput, { 'aria-label': 'Fruit' }),
              h(
                GhostComboboxTrigger,
                { 'aria-label': 'Show fruits' },
                () => 'v',
              ),
              h(
                GhostComboboxContent,
                { portal: options.portal ?? false },
                () => [
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
                    'button',
                    { type: 'button', 'data-testid': 'inside' },
                    'Inside',
                  ),
                ],
              ),
            ],
          },
        ),
        h('button', { type: 'button', 'data-testid': 'after' }, 'After'),
      ]
    },
  })
  const wrapper = mount(Fixture, { attachTo: document.body })
  attached.push(wrapper)
  const input = document.querySelector<HTMLInputElement>('[data-part="input"]')
  const trigger = document.querySelector<HTMLElement>('[data-part="trigger"]')
  const after = document.querySelector<HTMLElement>('[data-testid="after"]')
  const inside = document.querySelector<HTMLElement>('[data-testid="inside"]')
  if (!input || !trigger || !after || !inside) {
    throw new Error('fixture did not render')
  }
  return {
    input,
    trigger,
    after,
    inside,
    content: () => document.querySelector<HTMLElement>('[data-part="content"]'),
    onOpen,
    onSearchUpdate,
    onSearch,
    onModel,
  }
}

async function openByTyping(input: HTMLInputElement, text: string) {
  input.focus()
  input.value = text
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

describe('GhostCombobox focus departure (GHO-166)', () => {
  it('closes without restoring focus and resets single search to the committed label', async () => {
    const f = mountFixture({ initial: 'b' })
    await flushPromises()
    await openByTyping(f.input, 'ap')
    expect(f.input.getAttribute('aria-expanded')).toBe('true')
    f.onSearch.mockClear()

    f.after.focus()
    await flushPromises()

    expect(document.activeElement).toBe(f.after)
    expect(f.input.getAttribute('aria-expanded')).toBe('false')
    expect(f.content()?.hasAttribute('hidden')).toBe(true)
    expect(f.onOpen).toHaveBeenLastCalledWith(false)
    expect(f.onSearchUpdate).toHaveBeenLastCalledWith('Banana')
    expect(f.onSearch).toHaveBeenCalledTimes(1)
    expect(f.onSearch).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: 'Banana' }),
    )
    expect(f.onModel).not.toHaveBeenCalled()
    expect(f.input.value).toBe('Banana')
  })

  it('resets single search to empty when nothing is selected', async () => {
    const f = mountFixture()
    await flushPromises()
    await openByTyping(f.input, 'xy')

    f.input.blur()
    await flushPromises()

    expect(f.input.getAttribute('aria-expanded')).toBe('false')
    expect(f.onSearchUpdate).toHaveBeenLastCalledWith('')
    expect(f.input.value).toBe('')
    expect(f.onModel).not.toHaveBeenCalled()
  })

  it('resets multiple search to empty and keeps the selection', async () => {
    const f = mountFixture({ multiple: true, initial: ['a'] })
    await flushPromises()
    await openByTyping(f.input, 'ban')

    f.after.focus()
    await flushPromises()

    expect(f.input.getAttribute('aria-expanded')).toBe('false')
    expect(f.onSearchUpdate).toHaveBeenLastCalledWith('')
    expect(f.input.value).toBe('')
    expect(f.onModel).not.toHaveBeenCalled()
  })

  it('emits no search events when the query already matches', async () => {
    const f = mountFixture()
    await flushPromises()
    f.input.focus()
    f.input.click()
    await flushPromises()
    expect(f.input.getAttribute('aria-expanded')).toBe('true')

    f.after.focus()
    await flushPromises()

    expect(f.input.getAttribute('aria-expanded')).toBe('false')
    expect(f.onSearchUpdate).not.toHaveBeenCalled()
    expect(f.onSearch).not.toHaveBeenCalled()
  })

  for (const portal of [false, true]) {
    it(`keeps the list open for internal moves (portal: ${String(portal)})`, async () => {
      const f = mountFixture({ portal })
      await flushPromises()
      await openByTyping(f.input, 'a')

      f.trigger.focus()
      await flushPromises()
      expect(f.input.getAttribute('aria-expanded')).toBe('true')

      f.inside.focus()
      await flushPromises()
      expect(document.activeElement).toBe(f.inside)
      expect(f.input.getAttribute('aria-expanded')).toBe('true')

      f.input.focus()
      await flushPromises()
      expect(f.input.getAttribute('aria-expanded')).toBe('true')
      expect(f.onOpen).not.toHaveBeenCalledWith(false)

      // Leaving from inside the content still dismisses.
      f.inside.focus()
      f.after.focus()
      await flushPromises()
      expect(document.activeElement).toBe(f.after)
      expect(f.input.getAttribute('aria-expanded')).toBe('false')
    })
  }

  it('does not dismiss when a press inside the content blurs to body', async () => {
    const f = mountFixture()
    await flushPromises()
    await openByTyping(f.input, 'a')
    const content = f.content()
    if (!content) {
      throw new Error('content missing')
    }

    content.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    f.input.blur()
    await flushPromises()

    expect(f.input.getAttribute('aria-expanded')).toBe('true')
    expect(f.onOpen).not.toHaveBeenCalledWith(false)
  })

  it('keeps focus on the input when non-focusable content is pressed', async () => {
    const f = mountFixture()
    await flushPromises()
    await openByTyping(f.input, 'a')
    const listbox = document.querySelector<HTMLElement>('[role="listbox"]')
    const option = document.querySelector<HTMLElement>('[data-value="a"]')
    if (!listbox || !option) {
      throw new Error('listbox missing')
    }

    const onListbox = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    })
    listbox.dispatchEvent(onListbox)
    expect(onListbox.defaultPrevented).toBe(true)

    // Focusable descendants (options, consumer buttons) keep the default.
    const onOption = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    })
    option.dispatchEvent(onOption)
    expect(onOption.defaultPrevented).toBe(false)
    const onInside = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    })
    f.inside.dispatchEvent(onInside)
    expect(onInside.defaultPrevented).toBe(false)
  })

  it('selects an option by pointer without a premature dismissal', async () => {
    const f = mountFixture()
    await flushPromises()
    await openByTyping(f.input, 'a')
    const option = document.querySelector<HTMLElement>('[data-value="a"]')
    if (!option) {
      throw new Error('option missing')
    }

    option.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
    )
    option.focus()
    await flushPromises()
    expect(f.input.getAttribute('aria-expanded')).toBe('true')
    option.click()
    await flushPromises()

    expect(f.onModel).toHaveBeenLastCalledWith('a')
    expect(f.input.value).toBe('Apple')
    expect(document.activeElement).toBe(f.input)
  })

  it('keeps the list open when the window blurs but the input stays active', async () => {
    const f = mountFixture()
    await flushPromises()
    await openByTyping(f.input, 'a')

    f.input.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    )
    await flushPromises()

    expect(document.activeElement).toBe(f.input)
    expect(f.input.getAttribute('aria-expanded')).toBe('true')
  })

  it('lets a controlled parent reject the close and the search reset', async () => {
    const f = mountFixture({ rejectOpen: true, rejectSearch: 'pinned' })
    await flushPromises()
    f.input.focus()
    expect(f.input.getAttribute('aria-expanded')).toBe('true')

    f.after.focus()
    await flushPromises()

    expect(f.onOpen).toHaveBeenLastCalledWith(false)
    expect(f.onSearchUpdate).toHaveBeenLastCalledWith('')
    expect(document.activeElement).toBe(f.after)
    expect(f.input.getAttribute('aria-expanded')).toBe('true')
    expect(f.content()?.hasAttribute('hidden')).toBe(false)
    expect(f.input.value).toBe('pinned')
  })
})
