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
})
