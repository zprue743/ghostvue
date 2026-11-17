import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'

import GhostCombobox from './GhostCombobox.vue'
import GhostComboboxContent from './GhostComboboxContent.vue'
import GhostComboboxInput from './GhostComboboxInput.vue'
import GhostComboboxOption from './GhostComboboxOption.vue'
import GhostSelect from './GhostSelect.vue'
import GhostSelectContent from './GhostSelectContent.vue'
import GhostSelectOption from './GhostSelectOption.vue'
import GhostSelectTrigger from './GhostSelectTrigger.vue'
import GhostSelectValue from './GhostSelectValue.vue'
import { sortByDocumentOrder } from './sort-by-document-order'

/*
 * GHO-162 regression suite: option registries append on mount, so keyboard
 * traversal must follow the rendered DOM order rather than registration order
 * after keyed reordering, insertion before existing options, filtering and
 * remounting, disabled toggles, and a virtualized window scrolling back.
 */

interface FixtureOption {
  value: string
  disabled: boolean
}

function labelOf(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function toOptions(values: string[], disabled: string[] = []): FixtureOption[] {
  return values.map((value) => ({ value, disabled: disabled.includes(value) }))
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

function pressKey(element: Element, key: string): void {
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  )
}

describe('sortByDocumentOrder', () => {
  it('sorts connected elements by document position and keeps unplaceable items last in input order', () => {
    const root = document.createElement('div')
    const [first, second, third] = ['a', 'b', 'c'].map((id) => {
      const el = document.createElement('span')
      el.id = id
      root.append(el)
      return el
    })
    document.body.append(root)
    const detached = document.createElement('span')

    const items = [
      { id: 'third', el: third },
      { id: 'missing', el: null },
      { id: 'first', el: first },
      { id: 'detached', el: detached },
      { id: 'second', el: second },
    ]
    const sorted = sortByDocumentOrder(items, (item) => item.el)
    expect(sorted.map((item) => item.id)).toEqual([
      'first',
      'second',
      'third',
      'missing',
      'detached',
    ])
    // Input is not mutated.
    expect(items[0]?.id).toBe('third')
    root.remove()
  })
})

describe('GhostCombobox keyboard traversal follows DOM order', () => {
  function comboboxFixture(initial: FixtureOption[]) {
    const options = ref<FixtureOption[]>(initial)
    const component = defineComponent({
      setup() {
        return () =>
          h(
            GhostCombobox,
            { virtualized: true },
            {
              default: () => [
                h(GhostComboboxInput, { 'aria-label': 'Fruit' }),
                h(GhostComboboxContent, { portal: false }, () =>
                  options.value.map((option) =>
                    h(
                      GhostComboboxOption,
                      {
                        key: option.value,
                        value: option.value,
                        disabled: option.disabled,
                        textValue: labelOf(option.value),
                      },
                      () => labelOf(option.value),
                    ),
                  ),
                ),
              ],
            },
          )
      },
    })
    return { options, component }
  }

  async function setup(initial: FixtureOption[]) {
    const { options, component } = comboboxFixture(initial)
    const wrapper = mountAttached(component)
    await settle()
    const input = wrapper.get('[data-part="input"]').element
    async function press(key: string): Promise<string | undefined> {
      pressKey(input, key)
      await settle()
      const activeId = input.getAttribute('aria-activedescendant')
      if (!activeId) {
        return undefined
      }
      return (
        document.getElementById(activeId)?.getAttribute('data-value') ??
        undefined
      )
    }
    // Opens the listbox; the first ArrowDown also highlights the first option.
    await press('ArrowDown')
    return { options, press }
  }

  it('Home/Arrow follow DOM order after filtering to one option and restoring', async () => {
    const { options, press } = await setup(
      toOptions(['apple', 'banana', 'cherry']),
    )
    options.value = toOptions(['banana'])
    await settle()
    options.value = toOptions(['apple', 'banana', 'cherry'])
    await settle()

    expect(await press('Home')).toBe('apple')
    expect(await press('ArrowDown')).toBe('banana')
    expect(await press('ArrowDown')).toBe('cherry')
    expect(await press('ArrowDown')).toBe('apple')
    expect(await press('End')).toBe('cherry')
    expect(await press('ArrowUp')).toBe('banana')
  })

  it('follows keyed reordering', async () => {
    const { options, press } = await setup(
      toOptions(['apple', 'banana', 'cherry']),
    )
    options.value = toOptions(['cherry', 'apple', 'banana'])
    await settle()

    expect(await press('Home')).toBe('cherry')
    expect(await press('ArrowDown')).toBe('apple')
    expect(await press('ArrowDown')).toBe('banana')
    expect(await press('End')).toBe('banana')
  })

  it('places options inserted before existing ones first', async () => {
    const { options, press } = await setup(toOptions(['banana', 'cherry']))
    options.value = toOptions(['apple', 'banana', 'cherry'])
    await settle()

    expect(await press('Home')).toBe('apple')
    expect(await press('ArrowUp')).toBe('cherry')
    expect(await press('ArrowUp')).toBe('banana')
  })

  it('skips disabled options while keeping DOM order', async () => {
    const { options, press } = await setup(
      toOptions(['apple', 'banana', 'cherry', 'date']),
    )
    options.value = toOptions(['banana'])
    await settle()
    options.value = toOptions(['apple', 'banana', 'cherry', 'date'], ['cherry'])
    await settle()

    expect(await press('Home')).toBe('apple')
    expect(await press('ArrowDown')).toBe('banana')
    expect(await press('ArrowDown')).toBe('date')
    expect(await press('ArrowDown')).toBe('apple')
    expect(await press('End')).toBe('date')
    expect(await press('ArrowUp')).toBe('banana')
  })

  it('traverses the mounted virtualized window in DOM order after scrolling back', async () => {
    const all = Array.from({ length: 8 }, (_, index) => `item${String(index)}`)
    const { options, press } = await setup(toOptions(all.slice(0, 4)))
    // Scroll forward: item0/item1 unmount, item4/item5 mount.
    options.value = toOptions(all.slice(2, 6))
    await settle()
    // Scroll back: item0/item1 remount and register after item2/item3.
    options.value = toOptions(all.slice(0, 4))
    await settle()

    expect(await press('Home')).toBe('item0')
    expect(await press('ArrowDown')).toBe('item1')
    expect(await press('ArrowDown')).toBe('item2')
    expect(await press('End')).toBe('item3')
  })
})

describe('GhostSelect focus and typeahead follow DOM order', () => {
  function selectFixture(initial: FixtureOption[]) {
    const options = ref<FixtureOption[]>(initial)
    const component = defineComponent({
      setup() {
        return () =>
          h(GhostSelect, null, {
            default: () => [
              h(GhostSelectTrigger, { 'aria-label': 'Fruit' }, () =>
                h(GhostSelectValue, { placeholder: 'Pick' }),
              ),
              h(GhostSelectContent, { portal: false }, () =>
                options.value.map((option) =>
                  h(
                    GhostSelectOption,
                    {
                      key: option.value,
                      value: option.value,
                      disabled: option.disabled,
                      textValue: labelOf(option.value),
                    },
                    () => labelOf(option.value),
                  ),
                ),
              ),
            ],
          })
      },
    })
    return { options, component }
  }

  function focusedValue(): string | null | undefined {
    return document.activeElement?.getAttribute('data-value')
  }

  async function openWith(
    wrapper: ReturnType<typeof mount>,
    key: 'ArrowDown' | 'ArrowUp',
  ): Promise<void> {
    const trigger = wrapper.get('[data-part="trigger"]').element
    if (trigger instanceof HTMLElement) {
      trigger.focus()
    }
    pressKey(trigger, key)
    await settle()
  }

  async function closeSelect(wrapper: ReturnType<typeof mount>) {
    pressKey(wrapper.get('[data-part="listbox"]').element, 'Escape')
    await settle()
  }

  it('focuses the first / last enabled option in DOM order after filter and restore', async () => {
    const { options, component } = selectFixture(
      toOptions(['apple', 'banana', 'cherry', 'date']),
    )
    const wrapper = mountAttached(component)
    await settle()
    options.value = toOptions(['banana'])
    await settle()
    options.value = toOptions(['apple', 'banana', 'cherry', 'date'], ['date'])
    await settle()

    await openWith(wrapper, 'ArrowDown')
    expect(focusedValue()).toBe('apple')
    await closeSelect(wrapper)

    await openWith(wrapper, 'ArrowUp')
    expect(focusedValue()).toBe('cherry')
  })

  it('focuses the first option in DOM order after keyed reorder and insertion', async () => {
    const { options, component } = selectFixture(
      toOptions(['banana', 'cherry']),
    )
    const wrapper = mountAttached(component)
    await settle()
    options.value = toOptions(['cherry', 'banana'])
    await settle()
    options.value = toOptions(['apple', 'cherry', 'banana'])
    await settle()

    await openWith(wrapper, 'ArrowDown')
    expect(focusedValue()).toBe('apple')
    await closeSelect(wrapper)

    await openWith(wrapper, 'ArrowUp')
    expect(focusedValue()).toBe('banana')
  })

  it('typeahead picks the first match in DOM order', async () => {
    const { options, component } = selectFixture(
      toOptions(['blueberry', 'cherry', 'banana']),
    )
    const wrapper = mountAttached(component)
    await settle()
    // Keyed move: registration order keeps blueberry first, but banana now
    // renders first among the two "b" matches.
    options.value = toOptions(['banana', 'cherry', 'blueberry'])
    await settle()

    await openWith(wrapper, 'ArrowDown')
    const listbox = wrapper.get('[data-part="listbox"]').element
    pressKey(listbox, 'b')
    await settle()
    expect(focusedValue()).toBe('banana')
  })
})
