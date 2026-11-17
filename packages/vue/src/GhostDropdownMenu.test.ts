import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostDropdownMenu from './GhostDropdownMenu.vue'
import GhostDropdownMenuCheckboxItem from './GhostDropdownMenuCheckboxItem.vue'
import GhostDropdownMenuContent from './GhostDropdownMenuContent.vue'
import GhostDropdownMenuItem from './GhostDropdownMenuItem.vue'
import GhostDropdownMenuRadioGroup from './GhostDropdownMenuRadioGroup.vue'
import GhostDropdownMenuRadioItem from './GhostDropdownMenuRadioItem.vue'
import GhostDropdownMenuTrigger from './GhostDropdownMenuTrigger.vue'

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

function pressKey(key: string, target: EventTarget = document): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

function pointerDown(target: EventTarget): PointerEvent {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
  })
  target.dispatchEvent(event)
  return event
}

function getHtmlPart(part: string): HTMLElement {
  const element = document.querySelector(`[data-part="${part}"]`)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected [data-part="${part}"] to be an HTMLElement`)
  }
  return element
}

function getDataValueSelector(value: string): HTMLElement {
  const element = document.querySelector(`[data-value="${value}"]`)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected [data-value="${value}"] to be an HTMLElement`)
  }
  return element
}

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  computePositionOverride = null
})

describe('GhostDropdownMenu', () => {
  it('supports uncontrolled open/defaultOpen and controlled open', async () => {
    const uncontrolledUpdates: boolean[] = []
    const uncontrolled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              {
                defaultOpen: false,
                'onUpdate:open': (value: boolean) =>
                  uncontrolledUpdates.push(value),
              },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () =>
                    h(GhostDropdownMenuItem, null, () => 'One'),
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = uncontrolled.get('[data-part="trigger"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    await trigger.trigger('click')
    await flushPromises()

    expect(uncontrolledUpdates).toEqual([true])
    const content = document.querySelector<HTMLElement>('[data-part="content"]')
    expect(content).not.toBeNull()
    expect(content?.getAttribute('role')).toBe('menu')
    expect(trigger.attributes('aria-expanded')).toBe('true')

    await trigger.trigger('click')
    await flushPromises()
    expect(uncontrolledUpdates).toEqual([true, false])
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    uncontrolled.unmount()

    const open = ref(false)
    const controlledUpdates: boolean[] = []
    const controlledWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) =>
                  controlledUpdates.push(value),
              },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Controlled'),
                  h(GhostDropdownMenuContent, null, () => 'Body'),
                ],
              },
            )
        },
      }),
    )
    const controlledTrigger = controlledWrapper.get('[data-part="trigger"]')
    await controlledTrigger.trigger('click')
    await flushPromises()
    expect(controlledUpdates).toEqual([true])
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    open.value = true
    await nextTick()
    await flushPromises()
    expect(controlledTrigger.attributes('aria-expanded')).toBe('true')
  })

  it('opens with ArrowDown and ArrowUp and focuses first or last item', async () => {
    type ComputeResult = Awaited<ReturnType<typeof FloatingDom.computePosition>>
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      } satisfies ComputeResult)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostDropdownMenu, null, {
              default: () => [
                h(GhostDropdownMenuTrigger, null, () => 'Open'),
                h(GhostDropdownMenuContent, null, () => [
                  h(GhostDropdownMenuItem, null, () => 'First'),
                  h(GhostDropdownMenuItem, null, () => 'Last'),
                ]),
              ],
            })
        },
      }),
    )

    const trigger = getHtmlPart('trigger')
    trigger.focus()
    pressKey('ArrowDown', trigger)
    await flushPromises()

    const items = document.querySelectorAll<HTMLElement>('[data-part="item"]')
    expect(items.length).toBe(2)
    expect(document.activeElement?.textContent).toBe('First')

    const trigger2 = getHtmlPart('trigger')
    trigger2.click()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    pressKey('ArrowUp', trigger2)
    await flushPromises()
    expect(document.activeElement?.textContent).toBe('Last')
  })

  it('arrow keys, typeahead, and Home/End move roving focus among items', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () => [
                    h(GhostDropdownMenuItem, null, () => 'Apple'),
                    h(GhostDropdownMenuItem, null, () => 'Banana'),
                    h(GhostDropdownMenuItem, null, () => 'Cherry'),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const content = getHtmlPart('content')
    pressKey('ArrowDown', content)
    expect(document.activeElement?.textContent).toBe('Banana')
    pressKey('ArrowUp', content)
    expect(document.activeElement?.textContent).toBe('Apple')
    pressKey('End', content)
    expect(document.activeElement?.textContent).toBe('Cherry')
    pressKey('Home', content)
    expect(document.activeElement?.textContent).toBe('Apple')
    pressKey('b', content)
    expect(document.activeElement?.textContent).toBe('Banana')
    await new Promise((resolve) => setTimeout(resolve, 510))
    pressKey('c', content)
    expect(document.activeElement?.textContent).toBe('Cherry')
  })

  it('skips disabled items while roving', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () => [
                    h(GhostDropdownMenuItem, null, () => 'Enabled'),
                    h(
                      GhostDropdownMenuItem,
                      { disabled: true },
                      () => 'Disabled',
                    ),
                    h(GhostDropdownMenuItem, null, () => 'Also enabled'),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const content = getHtmlPart('content')
    const items = [
      ...content.querySelectorAll<HTMLElement>('[data-part="item"]'),
    ]
    items[0]?.focus()
    pressKey('ArrowDown', content)
    expect(document.activeElement?.textContent).toBe('Also enabled')
  })

  it('keeps the menu open when select is defaultPrevented', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () =>
                    h(
                      GhostDropdownMenuItem,
                      {
                        onSelect: (event: Event) => {
                          event.preventDefault()
                        },
                      },
                      () => 'Stay open',
                    ),
                  ),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    getHtmlPart('item').click()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('closes on Tab without restoring focus to the trigger', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () =>
                    h(GhostDropdownMenuItem, null, () => 'Action'),
                  ),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const trigger = getHtmlPart('trigger')
    const item = getHtmlPart('item')
    item.focus()
    pressKey('Tab', item)
    await flushPromises()

    expect(document.querySelector('[data-part="content"]')).toBeNull()
    // jsdom does not advance Tab focus; closing without restoring to the trigger is enough here.
    expect(document.activeElement).not.toBe(trigger)
  })

  it('closes on escape, outside pointer, and item select', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    const selectLog: string[] = []
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () =>
                    h(
                      GhostDropdownMenuItem,
                      {
                        onSelect: () => {
                          selectLog.push('selected')
                        },
                      },
                      () => 'Pick',
                    ),
                  ),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const trigger = getHtmlPart('trigger')
    trigger.focus()

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)

    trigger.click()
    await flushPromises()
    pointerDown(document.body)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    pressKey('ArrowDown', trigger)
    await flushPromises()
    const item = getHtmlPart('item')
    item.click()
    await flushPromises()
    expect(selectLog).toEqual(['selected'])
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('checkbox item toggles without closing; radio item closes on select', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    const checked = ref(false)
    const radio = ref('a')

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () => [
                    h(
                      GhostDropdownMenuCheckboxItem,
                      {
                        checked: checked.value,
                        'onUpdate:checked': (value: boolean) => {
                          checked.value = value
                        },
                      },
                      () => 'Show hidden',
                    ),
                    h(
                      GhostDropdownMenuRadioGroup,
                      {
                        modelValue: radio.value,
                        'onUpdate:modelValue': (value: string) => {
                          radio.value = value
                        },
                      },
                      () => [
                        h(
                          GhostDropdownMenuRadioItem,
                          { value: 'a' },
                          () => 'Option A',
                        ),
                        h(
                          GhostDropdownMenuRadioItem,
                          { value: 'b' },
                          () => 'Option B',
                        ),
                      ],
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    const checkbox = getHtmlPart('checkbox-item')
    checkbox.click()
    await flushPromises()
    expect(checked.value).toBe(true)
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    const radioB = getDataValueSelector('b')
    radioB.click()
    await flushPromises()
    expect(radio.value).toBe('b')
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('checkbox item toggles on Enter and Space while consumer onClick preventDefault cancels toggle', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    const checked = ref(false)
    const cancelToggle = ref(false)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () =>
                    h(
                      GhostDropdownMenuCheckboxItem,
                      {
                        checked: checked.value,
                        'onUpdate:checked': (value: boolean) => {
                          checked.value = value
                        },
                        onClick: (event: MouseEvent) => {
                          if (cancelToggle.value) {
                            event.preventDefault()
                          }
                        },
                      },
                      () => 'Show hidden',
                    ),
                  ),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const checkbox = getHtmlPart('checkbox-item')
    checkbox.focus()
    expect(checkbox.getAttribute('aria-checked')).toBe('false')

    const enterEvent = pressKey('Enter', checkbox)
    await flushPromises()
    expect(enterEvent.defaultPrevented).toBe(true)
    expect(checked.value).toBe(true)
    expect(checkbox.getAttribute('aria-checked')).toBe('true')
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    const spaceEvent = pressKey(' ', checkbox)
    await flushPromises()
    expect(spaceEvent.defaultPrevented).toBe(true)
    expect(checked.value).toBe(false)
    expect(checkbox.getAttribute('aria-checked')).toBe('false')
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    cancelToggle.value = true
    pressKey('Enter', checkbox)
    await flushPromises()
    expect(checked.value).toBe(false)
    expect(checkbox.getAttribute('aria-checked')).toBe('false')

    pressKey(' ', checkbox)
    await flushPromises()
    expect(checked.value).toBe(false)
    expect(checkbox.getAttribute('aria-checked')).toBe('false')

    checkbox.click()
    await flushPromises()
    expect(checked.value).toBe(false)
    expect(checkbox.getAttribute('aria-checked')).toBe('false')
  })

  it('Space activates default div menuitem and menuitemradio hosts', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    const selectLog: string[] = []
    const radio = ref('a')
    const open = ref(true)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () => [
                    h(
                      GhostDropdownMenuItem,
                      {
                        onSelect: () => {
                          selectLog.push('item')
                        },
                      },
                      () => 'Action',
                    ),
                    h(
                      GhostDropdownMenuRadioGroup,
                      {
                        modelValue: radio.value,
                        'onUpdate:modelValue': (value: string) => {
                          radio.value = value
                        },
                      },
                      () => [
                        h(
                          GhostDropdownMenuRadioItem,
                          { value: 'a' },
                          () => 'Option A',
                        ),
                        h(
                          GhostDropdownMenuRadioItem,
                          {
                            value: 'b',
                            onSelect: () => {
                              selectLog.push('radio:b')
                            },
                          },
                          () => 'Option B',
                        ),
                      ],
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const item = getHtmlPart('item')
    expect(item.tagName).toBe('DIV')
    item.focus()
    const itemSpaceEvent = pressKey(' ', item)
    await flushPromises()
    expect(itemSpaceEvent.defaultPrevented).toBe(true)
    expect(selectLog).toEqual(['item'])
    expect(open.value).toBe(false)

    open.value = true
    await flushPromises()

    const radioB = getDataValueSelector('b')
    expect(radioB.tagName).toBe('DIV')
    radioB.focus()
    const radioSpaceEvent = pressKey(' ', radioB)
    await flushPromises()
    expect(radioSpaceEvent.defaultPrevented).toBe(true)
    expect(radio.value).toBe('b')
    expect(selectLog).toEqual(['item', 'radio:b'])
    expect(open.value).toBe(false)
  })

  it('leaves IME composition keys to the input method (isComposing and keyCode 229)', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })
    const onSelect = vi.fn()
    const onOpen = vi.fn()
    const onChecked = vi.fn()

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              { defaultOpen: true, 'onUpdate:open': onOpen },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () => [
                    h(GhostDropdownMenuItem, { onSelect }, () => 'Apple'),
                    h(GhostDropdownMenuItem, null, () => 'Banana'),
                    h(
                      GhostDropdownMenuCheckboxItem,
                      { 'onUpdate:checked': onChecked },
                      () => 'Show hidden',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const content = getHtmlPart('content')
    const apple = document.activeElement
    expect(apple?.textContent).toBe('Apple')

    for (const init of [{ isComposing: true }, { keyCode: 229 }]) {
      for (const key of [
        'b',
        'ArrowDown',
        'ArrowUp',
        'End',
        'Enter',
        'Escape',
      ]) {
        const event = new KeyboardEvent('keydown', {
          ...init,
          key,
          bubbles: true,
          cancelable: true,
        })
        ;(document.activeElement ?? content).dispatchEvent(event)
        await flushPromises()
        expect(event.defaultPrevented, key).toBe(false)
        expect(document.activeElement, key).toBe(apple)
      }
    }
    expect(onSelect).not.toHaveBeenCalled()
    expect(onOpen).not.toHaveBeenCalled()

    // Checkbox items own Enter/Space; composing keys must not toggle them.
    const checkboxItem = document.querySelector('[role="menuitemcheckbox"]')
    expect(checkboxItem).toBeInstanceOf(HTMLElement)
    if (!(checkboxItem instanceof HTMLElement)) {
      return
    }
    for (const init of [{ isComposing: true }, { keyCode: 229 }]) {
      for (const key of ['Enter', ' ']) {
        const event = new KeyboardEvent('keydown', {
          ...init,
          key,
          bubbles: true,
          cancelable: true,
        })
        checkboxItem.dispatchEvent(event)
        await flushPromises()
        expect(event.defaultPrevented, key).toBe(false)
      }
    }
    expect(onChecked).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(apple)

    // After compositionend, typeahead resumes.
    pressKey('b', content)
    expect(document.activeElement?.textContent).toBe('Banana')
  })

  it('Space continues active typeahead queries before activating after timeout', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    const selectLog: string[] = []
    const open = ref(true)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, null, () => [
                    h(
                      GhostDropdownMenuItem,
                      {
                        onSelect: () => {
                          selectLog.push('Save')
                        },
                      },
                      () => 'Save',
                    ),
                    h(
                      GhostDropdownMenuItem,
                      {
                        onSelect: () => {
                          selectLog.push('Save As')
                        },
                      },
                      () => 'Save As',
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const items = [
      ...document.querySelectorAll<HTMLElement>('[data-part="item"]'),
    ]
    const saveItem = items[0]
    const saveAsItem = items[1]
    expect(saveItem).toBeDefined()
    expect(saveAsItem).toBeDefined()

    saveItem?.focus()
    for (const key of ['s', 'a', 'v', 'e', ' ', 'a']) {
      pressKey(key, document.activeElement ?? saveItem)
    }
    await flushPromises()

    expect(document.activeElement).toBe(saveAsItem)
    expect(selectLog).toEqual([])
    expect(open.value).toBe(true)

    await new Promise((resolve) => setTimeout(resolve, 510))
    const spaceEvent = pressKey(' ', saveAsItem)
    await flushPromises()
    expect(spaceEvent.defaultPrevented).toBe(true)
    expect(selectLog).toEqual(['Save As'])
    expect(open.value).toBe(false)
  })

  it('blocks consumer onClick handlers and state changes on disabled ordinary, checkbox, and radio items', async () => {
    const open = ref(true)
    const checked = ref(false)
    const radio = ref('a')

    const itemFnClick = vi.fn()
    const itemArrClickA = vi.fn()
    const itemArrClickB = vi.fn()
    const itemSelect = vi.fn()

    const checkboxFnClick = vi.fn()
    const checkboxArrClickA = vi.fn()
    const checkboxArrClickB = vi.fn()
    const checkboxUpdate = vi.fn()

    const radioFnClick = vi.fn()
    const radioArrClickA = vi.fn()
    const radioArrClickB = vi.fn()
    const radioSelect = vi.fn()
    const radioUpdate = vi.fn()

    const groupDisabledClick = vi.fn()

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, { portal: false }, () => [
                    h(
                      GhostDropdownMenuItem,
                      {
                        disabled: true,
                        'data-testid': 'item-fn',
                        onClick: itemFnClick,
                        onSelect: itemSelect,
                      },
                      () => 'Item Fn',
                    ),
                    h(
                      GhostDropdownMenuItem,
                      {
                        disabled: true,
                        'data-testid': 'item-arr',
                        onClick: [itemArrClickA, itemArrClickB] as unknown as (
                          event: MouseEvent,
                        ) => void,
                        onSelect: itemSelect,
                      },
                      () => 'Item Arr',
                    ),
                    h(
                      GhostDropdownMenuCheckboxItem,
                      {
                        disabled: true,
                        checked: checked.value,
                        'data-testid': 'checkbox-fn',
                        onClick: checkboxFnClick,
                        'onUpdate:checked': (next: boolean) => {
                          checked.value = next
                          checkboxUpdate(next)
                        },
                      },
                      () => 'Checkbox Fn',
                    ),
                    h(
                      GhostDropdownMenuCheckboxItem,
                      {
                        disabled: true,
                        checked: checked.value,
                        'data-testid': 'checkbox-arr',
                        onClick: [
                          checkboxArrClickA,
                          checkboxArrClickB,
                        ] as unknown as (event: MouseEvent) => void,
                        'onUpdate:checked': (next: boolean) => {
                          checked.value = next
                          checkboxUpdate(next)
                        },
                      },
                      () => 'Checkbox Arr',
                    ),
                    h(
                      GhostDropdownMenuRadioGroup,
                      {
                        modelValue: radio.value,
                        'onUpdate:modelValue': (next: string) => {
                          radio.value = next
                          radioUpdate(next)
                        },
                      },
                      () => [
                        h(
                          GhostDropdownMenuRadioItem,
                          {
                            value: 'b',
                            disabled: true,
                            'data-testid': 'radio-fn',
                            onClick: radioFnClick,
                            onSelect: radioSelect,
                          },
                          () => 'Radio Fn',
                        ),
                        h(
                          GhostDropdownMenuRadioItem,
                          {
                            value: 'c',
                            disabled: true,
                            'data-testid': 'radio-arr',
                            onClick: [
                              radioArrClickA,
                              radioArrClickB,
                            ] as unknown as (event: MouseEvent) => void,
                            onSelect: radioSelect,
                          },
                          () => 'Radio Arr',
                        ),
                      ],
                    ),
                    h(
                      GhostDropdownMenuRadioGroup,
                      {
                        disabled: true,
                        modelValue: radio.value,
                        'onUpdate:modelValue': (next: string) => {
                          radio.value = next
                          radioUpdate(next)
                        },
                      },
                      () =>
                        h(
                          GhostDropdownMenuRadioItem,
                          {
                            value: 'd',
                            'data-testid': 'radio-group-disabled',
                            onClick: groupDisabledClick,
                            onSelect: radioSelect,
                          },
                          () => 'Radio Group Disabled',
                        ),
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    const clickAndCheck = async (testId: string) => {
      const el = document.querySelector<HTMLElement>(
        `[data-testid="${testId}"]`,
      )
      if (!el) throw new Error(`Missing ${testId}`)
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(clickEvent)
      expect(clickEvent.defaultPrevented).toBe(true)
      pressKey('Enter', el)
      pressKey(' ', el)
      await flushPromises()
    }

    await clickAndCheck('item-fn')
    await clickAndCheck('item-arr')
    expect(itemFnClick).not.toHaveBeenCalled()
    expect(itemArrClickA).not.toHaveBeenCalled()
    expect(itemArrClickB).not.toHaveBeenCalled()
    expect(itemSelect).not.toHaveBeenCalled()

    await clickAndCheck('checkbox-fn')
    await clickAndCheck('checkbox-arr')
    expect(checkboxFnClick).not.toHaveBeenCalled()
    expect(checkboxArrClickA).not.toHaveBeenCalled()
    expect(checkboxArrClickB).not.toHaveBeenCalled()
    expect(checkboxUpdate).not.toHaveBeenCalled()
    expect(checked.value).toBe(false)

    await clickAndCheck('radio-fn')
    await clickAndCheck('radio-arr')
    await clickAndCheck('radio-group-disabled')
    expect(radioFnClick).not.toHaveBeenCalled()
    expect(radioArrClickA).not.toHaveBeenCalled()
    expect(radioArrClickB).not.toHaveBeenCalled()
    expect(groupDisabledClick).not.toHaveBeenCalled()
    expect(radioSelect).not.toHaveBeenCalled()
    expect(radioUpdate).not.toHaveBeenCalled()
    expect(radio.value).toBe('a')
    expect(open.value).toBe(true)
  })

  it('invokes enabled consumer onClick handlers and respects preventDefault cancellation', async () => {
    const open = ref(true)
    const checked = ref(false)
    const radio = ref('a')

    const itemPrevent = vi.fn((event: MouseEvent) => {
      event.preventDefault()
    })
    const itemSelect = vi.fn()
    const checkboxArrFirst = vi.fn()
    const checkboxArrPrevent = vi.fn((event: MouseEvent) => {
      event.preventDefault()
    })
    const checkboxUpdate = vi.fn()
    const radioPrevent = vi.fn((event: MouseEvent) => {
      event.preventDefault()
    })
    const radioSelect = vi.fn()
    const radioUpdate = vi.fn()

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostDropdownMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                  h(GhostDropdownMenuContent, { portal: false }, () => [
                    h(
                      GhostDropdownMenuItem,
                      {
                        'data-testid': 'enabled-item',
                        onClick: itemPrevent,
                        onSelect: itemSelect,
                      },
                      () => 'Item',
                    ),
                    h(
                      GhostDropdownMenuCheckboxItem,
                      {
                        checked: checked.value,
                        'data-testid': 'enabled-checkbox',
                        onClick: [
                          checkboxArrFirst,
                          checkboxArrPrevent,
                        ] as unknown as (event: MouseEvent) => void,
                        'onUpdate:checked': (next: boolean) => {
                          checked.value = next
                          checkboxUpdate(next)
                        },
                      },
                      () => 'Checkbox',
                    ),
                    h(
                      GhostDropdownMenuRadioGroup,
                      {
                        modelValue: radio.value,
                        'onUpdate:modelValue': (next: string) => {
                          radio.value = next
                          radioUpdate(next)
                        },
                      },
                      () =>
                        h(
                          GhostDropdownMenuRadioItem,
                          {
                            value: 'b',
                            'data-testid': 'enabled-radio',
                            onClick: radioPrevent,
                            onSelect: radioSelect,
                          },
                          () => 'Radio',
                        ),
                    ),
                  ]),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()

    document.querySelector<HTMLElement>('[data-testid="enabled-item"]')?.click()
    await flushPromises()
    expect(itemPrevent).toHaveBeenCalledTimes(1)
    expect(itemSelect).toHaveBeenCalledTimes(1)
    expect(open.value).toBe(true)

    document
      .querySelector<HTMLElement>('[data-testid="enabled-checkbox"]')
      ?.click()
    await flushPromises()
    expect(checkboxArrFirst).toHaveBeenCalledTimes(1)
    expect(checkboxArrPrevent).toHaveBeenCalledTimes(1)
    expect(checkboxUpdate).not.toHaveBeenCalled()
    expect(checked.value).toBe(false)

    document
      .querySelector<HTMLElement>('[data-testid="enabled-radio"]')
      ?.click()
    await flushPromises()
    expect(radioPrevent).toHaveBeenCalledTimes(1)
    expect(radioUpdate).toHaveBeenCalledWith('b')
    expect(radioSelect).toHaveBeenCalledTimes(1)
    expect(open.value).toBe(true)
  })

  it('keeps active match on typeahead query extension while supporting repeated-letter cycling, timeout reset, no match, disabled items, and wraparound', async () => {
    computePositionOverride = () =>
      Promise.resolve({
        x: 0,
        y: 0,
        placement: 'bottom',
        strategy: 'absolute',
        middlewareData: {},
      })

    vi.useFakeTimers()
    try {
      mountAttached(
        defineComponent({
          setup() {
            return () =>
              h(
                GhostDropdownMenu,
                { defaultOpen: true },
                {
                  default: () => [
                    h(GhostDropdownMenuTrigger, null, () => 'Menu'),
                    h(GhostDropdownMenuContent, null, () => [
                      h(GhostDropdownMenuItem, null, () => 'Able'),
                      h(GhostDropdownMenuItem, null, () => 'Banana'),
                      h(
                        GhostDropdownMenuItem,
                        { disabled: true },
                        () => 'Abalone',
                      ),
                      h(GhostDropdownMenuItem, null, () => 'Abacus'),
                      h(GhostDropdownMenuItem, null, () => 'Aardvark'),
                    ]),
                  ],
                },
              )
          },
        }),
      )
      await flushPromises()

      const content = getHtmlPart('content')
      const items = [
        ...content.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ]
      const [able, banana, abalone, abacus, aardvark] = items
      expect(items).toHaveLength(5)

      const expectSingleTabStop = (active: HTMLElement | undefined) => {
        expect(document.activeElement).toBe(active)
        for (const item of items) {
          expect(item.tabIndex).toBe(item === active ? 0 : -1)
        }
      }

      // Focus Banana first so 'a' starts searching after Banana and skips disabled Abalone.
      banana?.focus()
      pressKey('a', content)
      expectSingleTabStop(abacus)

      // Extending 'a' -> 'ab' keeps Abacus focused rather than cycling to Able.
      pressKey('b', content)
      expectSingleTabStop(abacus)

      // Extending 'ab' -> 'abl' no longer matches Abacus, so it wraps around to Able.
      pressKey('l', content)
      expectSingleTabStop(able)

      // No match leaves current focus and roving tab stop intact.
      pressKey('z', content)
      expectSingleTabStop(able)

      // Timeout reset clears the query so 'b' matches Banana.
      vi.advanceTimersByTime(500)
      pressKey('b', content)
      expectSingleTabStop(banana)

      // Rapid repeated 'a' matches 'aa' (Aardvark) when present, then 'aaa' cycles past it.
      vi.advanceTimersByTime(500)
      pressKey('a', content)
      expectSingleTabStop(abacus)
      pressKey('a', content)
      expectSingleTabStop(aardvark)
      pressKey('a', content)
      expectSingleTabStop(able)

      // After timeout, repeated single 'a' presses cycle through enabled 'A' items.
      vi.advanceTimersByTime(500)
      pressKey('a', content)
      expectSingleTabStop(abacus)
      vi.advanceTimersByTime(500)
      pressKey('a', content)
      expectSingleTabStop(aardvark)
      expect(abalone?.tabIndex).toBe(-1)
    } finally {
      vi.useRealTimers()
    }
  })
})
