import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GhostContextMenu from './GhostContextMenu.vue'
import GhostContextMenuCheckboxItem from './GhostContextMenuCheckboxItem.vue'
import GhostContextMenuContent from './GhostContextMenuContent.vue'
import GhostContextMenuItem from './GhostContextMenuItem.vue'
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

  it('gives the default span trigger tabindex 0 for keyboard access', async () => {
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
})
