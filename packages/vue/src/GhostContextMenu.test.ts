import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GhostContextMenu from './GhostContextMenu.vue'
import GhostContextMenuCheckboxItem from './GhostContextMenuCheckboxItem.vue'
import GhostContextMenuContent from './GhostContextMenuContent.vue'
import GhostContextMenuItem from './GhostContextMenuItem.vue'
import GhostContextMenuRadioGroup from './GhostContextMenuRadioGroup.vue'
import GhostContextMenuRadioItem from './GhostContextMenuRadioItem.vue'
import GhostContextMenuTrigger from './GhostContextMenuTrigger.vue'

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

function dispatchContextMenu(
  target: EventTarget,
  clientX = 12,
  clientY = 34,
): MouseEvent {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
  })
  target.dispatchEvent(event)
  return event
}

function pointerDownTouch(
  target: EventTarget,
  clientX = 20,
  clientY = 30,
  pointerId = 1,
): PointerEvent {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId,
    pointerType: 'touch',
    clientX,
    clientY,
  })
  target.dispatchEvent(event)
  return event
}

function pointerMoveTouch(
  target: EventTarget,
  clientX: number,
  clientY: number,
  pointerId = 1,
): PointerEvent {
  const event = new PointerEvent('pointermove', {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: 'touch',
    clientX,
    clientY,
  })
  target.dispatchEvent(event)
  return event
}

function pointerDownMouse(
  target: EventTarget,
  clientX = 20,
  clientY = 30,
  pointerId = 1,
): PointerEvent {
  const event = new PointerEvent('pointerdown', {
    bubbles: true,
    cancelable: true,
    button: 0,
    pointerId,
    pointerType: 'mouse',
    clientX,
    clientY,
  })
  target.dispatchEvent(event)
  return event
}

function pointerUpMouse(target: EventTarget, pointerId = 1): PointerEvent {
  const event = new PointerEvent('pointerup', {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: 'mouse',
  })
  target.dispatchEvent(event)
  return event
}

function pointerUpTouch(target: EventTarget, pointerId = 1): PointerEvent {
  const event = new PointerEvent('pointerup', {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: 'touch',
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

type ComputeResult = Awaited<ReturnType<typeof FloatingDom.computePosition>>

function stubFloatingPosition(): void {
  computePositionOverride = () =>
    Promise.resolve({
      x: 0,
      y: 0,
      placement: 'bottom-start',
      strategy: 'fixed',
      middlewareData: {},
    } satisfies ComputeResult)
}

afterEach(() => {
  vi.useRealTimers()
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  computePositionOverride = null
})

describe('GhostContextMenu', () => {
  it('supports uncontrolled open/defaultOpen and controlled open via contextmenu', async () => {
    stubFloatingPosition()

    const uncontrolledUpdates: boolean[] = []
    const uncontrolled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostContextMenu,
              {
                defaultOpen: false,
                'onUpdate:open': (value: boolean) =>
                  uncontrolledUpdates.push(value),
              },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Menu'),
                  h(GhostContextMenuContent, null, () =>
                    h(GhostContextMenuItem, null, () => 'One'),
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = getHtmlPart('trigger')
    expect(trigger.getAttribute('aria-expanded')).toBeNull()
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    dispatchContextMenu(trigger)
    await flushPromises()

    expect(uncontrolledUpdates).toEqual([true])
    const content = document.querySelector<HTMLElement>('[data-part="content"]')
    expect(content).not.toBeNull()
    expect(content?.getAttribute('role')).toBe('menu')
    expect(trigger.getAttribute('data-state')).toBe('open')

    pressKey('Escape')
    await flushPromises()
    expect(uncontrolledUpdates).toEqual([true, false])
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    uncontrolled.unmount()

    const open = ref(false)
    const controlledUpdates: boolean[] = []
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostContextMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) =>
                  controlledUpdates.push(value),
              },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Controlled'),
                  h(GhostContextMenuContent, null, () => 'Body'),
                ],
              },
            )
        },
      }),
    )

    const controlledTrigger = getHtmlPart('trigger')
    dispatchContextMenu(controlledTrigger)
    await flushPromises()
    expect(controlledUpdates).toEqual([true])
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    open.value = true
    await nextTick()
    await flushPromises()
    expect(controlledTrigger.getAttribute('data-state')).toBe('open')
  })

  it('does not open on primary click', async () => {
    stubFloatingPosition()
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostContextMenu, null, {
              default: () => [
                h(GhostContextMenuTrigger, null, () => 'Target'),
                h(GhostContextMenuContent, null, () =>
                  h(GhostContextMenuItem, null, () => 'Action'),
                ),
              ],
            })
        },
      }),
    )

    const trigger = getHtmlPart('trigger')
    trigger.click()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('does not open when disabled and does not preventDefault on contextmenu', async () => {
    stubFloatingPosition()
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostContextMenu, null, {
              default: () => [
                h(GhostContextMenuTrigger, { disabled: true }, () => 'Blocked'),
                h(GhostContextMenuContent, null, () =>
                  h(GhostContextMenuItem, null, () => 'Action'),
                ),
              ],
            })
        },
      }),
    )

    const trigger = getHtmlPart('trigger')
    const event = dispatchContextMenu(trigger)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(event.defaultPrevented).toBe(false)
  })

  it('gives the default span trigger tabindex 0 for keyboard access', () => {
    stubFloatingPosition()
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostContextMenu, null, {
              default: () => [
                h(GhostContextMenuTrigger, null, () => 'Target'),
                h(GhostContextMenuContent, null, () =>
                  h(GhostContextMenuItem, null, () => 'Action'),
                ),
              ],
            })
        },
      }),
    )

    const trigger = getHtmlPart('trigger')
    expect(trigger.tagName).toBe('SPAN')
    expect(trigger.getAttribute('tabindex')).toBe('0')
  })

  it('repositions and preventDefaults when contextmenu fires while open', async () => {
    computePositionOverride = (reference) => {
      const rect = reference.getBoundingClientRect()
      return Promise.resolve({
        x: rect.x,
        y: rect.y,
        placement: 'bottom-start',
        strategy: 'fixed',
        middlewareData: {},
      } satisfies ComputeResult)
    }

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostContextMenu, null, {
              default: () => [
                h(GhostContextMenuTrigger, null, () => 'Target'),
                h(GhostContextMenuContent, null, () =>
                  h(GhostContextMenuItem, null, () => 'Action'),
                ),
              ],
            })
        },
      }),
    )

    const trigger = getHtmlPart('trigger')
    dispatchContextMenu(trigger, 40, 50)
    await flushPromises()

    const content = getHtmlPart('content')
    expect(content.style.left).toBe('40px')
    expect(content.style.top).toBe('50px')

    const event = dispatchContextMenu(trigger, 120, 140)
    await flushPromises()
    expect(event.defaultPrevented).toBe(true)
    expect(content.style.left).toBe('120px')
    expect(content.style.top).toBe('140px')
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('opens with Shift+F10 and ContextMenu keys', async () => {
    stubFloatingPosition()
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostContextMenu, null, {
              default: () => [
                h(GhostContextMenuTrigger, null, () => 'Keyboard'),
                h(GhostContextMenuContent, null, () =>
                  h(GhostContextMenuItem, null, () => 'Pick'),
                ),
              ],
            })
        },
      }),
    )

    const trigger = getHtmlPart('trigger')
    trigger.focus()

    pressKey('ContextMenu', trigger)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    const shiftF10 = new KeyboardEvent('keydown', {
      key: 'F10',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    trigger.dispatchEvent(shiftF10)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('arrow keys move roving focus among items when defaultOpen', async () => {
    stubFloatingPosition()
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostContextMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Menu'),
                  h(GhostContextMenuContent, null, () => [
                    h(GhostContextMenuItem, null, () => 'Apple'),
                    h(GhostContextMenuItem, null, () => 'Banana'),
                    h(GhostContextMenuItem, null, () => 'Cherry'),
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
  })

  it('escape restores trigger focus; item select closes; checkbox stays open', async () => {
    stubFloatingPosition()
    const selectLog: string[] = []
    const checked = ref(false)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostContextMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Menu'),
                  h(GhostContextMenuContent, null, () => [
                    h(
                      GhostContextMenuItem,
                      {
                        onSelect: () => {
                          selectLog.push('selected')
                        },
                      },
                      () => 'Pick',
                    ),
                    h(
                      GhostContextMenuCheckboxItem,
                      {
                        checked: checked.value,
                        'onUpdate:checked': (value: boolean) => {
                          checked.value = value
                        },
                      },
                      () => 'Toggle',
                    ),
                  ]),
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

    dispatchContextMenu(trigger)
    await flushPromises()

    getHtmlPart('item').click()
    await flushPromises()
    expect(selectLog).toEqual(['selected'])
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    dispatchContextMenu(trigger)
    await flushPromises()

    const checkbox = getHtmlPart('checkbox-item')
    checkbox.click()
    await flushPromises()
    expect(checked.value).toBe(true)
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('checkbox item toggles on Enter and Space while consumer onClick preventDefault cancels toggle', async () => {
    stubFloatingPosition()
    const checked = ref(false)
    const cancelToggle = ref(false)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostContextMenu,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Menu'),
                  h(GhostContextMenuContent, null, () =>
                    h(
                      GhostContextMenuCheckboxItem,
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
                      () => 'Toggle',
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

  describe('long-press on touch pointers', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      stubFloatingPosition()
    })

    it('does not open on mouse press-and-hold', async () => {
      mountAttached(
        defineComponent({
          setup() {
            return () =>
              h(GhostContextMenu, null, {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Mouse'),
                  h(GhostContextMenuContent, null, () =>
                    h(GhostContextMenuItem, null, () => 'Action'),
                  ),
                ],
              })
          },
        }),
      )

      const trigger = getHtmlPart('trigger')
      pointerDownMouse(trigger)
      vi.advanceTimersByTime(800)
      await flushPromises()
      expect(document.querySelector('[data-part="content"]')).toBeNull()

      pointerUpMouse(trigger)
    })

    it('opens after the delay and cancels when pointerup fires first', async () => {
      mountAttached(
        defineComponent({
          setup() {
            return () =>
              h(GhostContextMenu, null, {
                default: () => [
                  h(
                    GhostContextMenuTrigger,
                    { longPressDelay: 400 },
                    () => 'Touch',
                  ),
                  h(GhostContextMenuContent, null, () =>
                    h(GhostContextMenuItem, null, () => 'Action'),
                  ),
                ],
              })
          },
        }),
      )

      const trigger = getHtmlPart('trigger')
      pointerDownTouch(trigger, 40, 50)
      vi.advanceTimersByTime(399)
      await flushPromises()
      expect(document.querySelector('[data-part="content"]')).toBeNull()

      pointerUpTouch(trigger)
      vi.advanceTimersByTime(10)
      await flushPromises()
      expect(document.querySelector('[data-part="content"]')).toBeNull()

      pointerDownTouch(trigger, 40, 50)
      vi.advanceTimersByTime(400)
      await flushPromises()
      expect(document.querySelector('[data-part="content"]')).not.toBeNull()
    })

    it('cancels when the pointer moves beyond the tolerance', async () => {
      mountAttached(
        defineComponent({
          setup() {
            return () =>
              h(GhostContextMenu, null, {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Touch'),
                  h(GhostContextMenuContent, null, () =>
                    h(GhostContextMenuItem, null, () => 'Action'),
                  ),
                ],
              })
          },
        }),
      )

      const trigger = getHtmlPart('trigger')
      pointerDownTouch(trigger, 0, 0)
      pointerMoveTouch(trigger, 20, 0)
      vi.advanceTimersByTime(600)
      await flushPromises()
      expect(document.querySelector('[data-part="content"]')).toBeNull()
    })
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
              GhostContextMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Target'),
                  h(GhostContextMenuContent, { portal: false }, () => [
                    h(
                      GhostContextMenuItem,
                      {
                        disabled: true,
                        'data-testid': 'ctx-item-fn',
                        onClick: itemFnClick,
                        onSelect: itemSelect,
                      },
                      () => 'Item Fn',
                    ),
                    h(
                      GhostContextMenuItem,
                      {
                        disabled: true,
                        'data-testid': 'ctx-item-arr',
                        onClick: [itemArrClickA, itemArrClickB] as unknown as (
                          event: MouseEvent,
                        ) => void,
                        onSelect: itemSelect,
                      },
                      () => 'Item Arr',
                    ),
                    h(
                      GhostContextMenuCheckboxItem,
                      {
                        disabled: true,
                        checked: checked.value,
                        'data-testid': 'ctx-checkbox-fn',
                        onClick: checkboxFnClick,
                        'onUpdate:checked': (next: boolean) => {
                          checked.value = next
                          checkboxUpdate(next)
                        },
                      },
                      () => 'Checkbox Fn',
                    ),
                    h(
                      GhostContextMenuCheckboxItem,
                      {
                        disabled: true,
                        checked: checked.value,
                        'data-testid': 'ctx-checkbox-arr',
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
                      GhostContextMenuRadioGroup,
                      {
                        modelValue: radio.value,
                        'onUpdate:modelValue': (next: string) => {
                          radio.value = next
                          radioUpdate(next)
                        },
                      },
                      () => [
                        h(
                          GhostContextMenuRadioItem,
                          {
                            value: 'b',
                            disabled: true,
                            'data-testid': 'ctx-radio-fn',
                            onClick: radioFnClick,
                            onSelect: radioSelect,
                          },
                          () => 'Radio Fn',
                        ),
                        h(
                          GhostContextMenuRadioItem,
                          {
                            value: 'c',
                            disabled: true,
                            'data-testid': 'ctx-radio-arr',
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
                      GhostContextMenuRadioGroup,
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
                          GhostContextMenuRadioItem,
                          {
                            value: 'd',
                            'data-testid': 'ctx-radio-group-disabled',
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

    await clickAndCheck('ctx-item-fn')
    await clickAndCheck('ctx-item-arr')
    expect(itemFnClick).not.toHaveBeenCalled()
    expect(itemArrClickA).not.toHaveBeenCalled()
    expect(itemArrClickB).not.toHaveBeenCalled()
    expect(itemSelect).not.toHaveBeenCalled()

    await clickAndCheck('ctx-checkbox-fn')
    await clickAndCheck('ctx-checkbox-arr')
    expect(checkboxFnClick).not.toHaveBeenCalled()
    expect(checkboxArrClickA).not.toHaveBeenCalled()
    expect(checkboxArrClickB).not.toHaveBeenCalled()
    expect(checkboxUpdate).not.toHaveBeenCalled()
    expect(checked.value).toBe(false)

    await clickAndCheck('ctx-radio-fn')
    await clickAndCheck('ctx-radio-arr')
    await clickAndCheck('ctx-radio-group-disabled')
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
              GhostContextMenu,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(GhostContextMenuTrigger, null, () => 'Target'),
                  h(GhostContextMenuContent, { portal: false }, () => [
                    h(
                      GhostContextMenuItem,
                      {
                        'data-testid': 'ctx-enabled-item',
                        onClick: itemPrevent,
                        onSelect: itemSelect,
                      },
                      () => 'Item',
                    ),
                    h(
                      GhostContextMenuCheckboxItem,
                      {
                        checked: checked.value,
                        'data-testid': 'ctx-enabled-checkbox',
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
                      GhostContextMenuRadioGroup,
                      {
                        modelValue: radio.value,
                        'onUpdate:modelValue': (next: string) => {
                          radio.value = next
                          radioUpdate(next)
                        },
                      },
                      () =>
                        h(
                          GhostContextMenuRadioItem,
                          {
                            value: 'b',
                            'data-testid': 'ctx-enabled-radio',
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

    document
      .querySelector<HTMLElement>('[data-testid="ctx-enabled-item"]')
      ?.click()
    await flushPromises()
    expect(itemPrevent).toHaveBeenCalledTimes(1)
    expect(itemSelect).toHaveBeenCalledTimes(1)
    expect(open.value).toBe(true)

    document
      .querySelector<HTMLElement>('[data-testid="ctx-enabled-checkbox"]')
      ?.click()
    await flushPromises()
    expect(checkboxArrFirst).toHaveBeenCalledTimes(1)
    expect(checkboxArrPrevent).toHaveBeenCalledTimes(1)
    expect(checkboxUpdate).not.toHaveBeenCalled()
    expect(checked.value).toBe(false)

    document
      .querySelector<HTMLElement>('[data-testid="ctx-enabled-radio"]')
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
        placement: 'bottom-start',
        strategy: 'fixed',
        middlewareData: {},
      })

    vi.useFakeTimers()
    try {
      mountAttached(
        defineComponent({
          setup() {
            return () =>
              h(
                GhostContextMenu,
                { defaultOpen: true },
                {
                  default: () => [
                    h(GhostContextMenuTrigger, null, () => 'Target'),
                    h(GhostContextMenuContent, null, () => [
                      h(GhostContextMenuItem, null, () => 'Able'),
                      h(GhostContextMenuItem, null, () => 'Banana'),
                      h(
                        GhostContextMenuItem,
                        { disabled: true },
                        () => 'Abalone',
                      ),
                      h(GhostContextMenuItem, null, () => 'Abacus'),
                    ]),
                  ],
                },
              )
          },
        }),
      )
      await flushPromises()

      const content = document.querySelector<HTMLElement>(
        '[data-part="content"]',
      )
      expect(content).not.toBeNull()
      if (!content) {
        return
      }
      const items = [
        ...content.querySelectorAll<HTMLElement>('[role="menuitem"]'),
      ]
      const [able, banana, abalone, abacus] = items
      expect(items).toHaveLength(4)

      const expectSingleTabStop = (active: HTMLElement | undefined) => {
        expect(document.activeElement).toBe(active)
        for (const item of items) {
          expect(item.tabIndex).toBe(item === active ? 0 : -1)
        }
      }

      banana?.focus()
      pressKey('a', content)
      expectSingleTabStop(abacus)

      // Extending 'a' -> 'ab' keeps Abacus focused; 'abl' wraps around to Able.
      pressKey('b', content)
      expectSingleTabStop(abacus)
      pressKey('l', content)
      expectSingleTabStop(able)

      // No match leaves focus unchanged.
      pressKey('z', content)
      expectSingleTabStop(able)

      // Timeout reset + rapid repeated 'a' cycling without any 'aa*' item.
      vi.advanceTimersByTime(500)
      pressKey('b', content)
      expectSingleTabStop(banana)

      vi.advanceTimersByTime(500)
      pressKey('a', content)
      expectSingleTabStop(abacus)
      pressKey('a', content)
      expectSingleTabStop(able)
      pressKey('a', content)
      expectSingleTabStop(abacus)
      expect(abalone?.tabIndex).toBe(-1)
    } finally {
      vi.useRealTimers()
    }
  })
})
