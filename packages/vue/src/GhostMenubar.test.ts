import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostMenubar from './GhostMenubar.vue'
import GhostMenubarCheckboxItem from './GhostMenubarCheckboxItem.vue'
import GhostMenubarContent from './GhostMenubarContent.vue'
import GhostMenubarItem from './GhostMenubarItem.vue'
import GhostMenubarMenu from './GhostMenubarMenu.vue'
import GhostMenubarRadioGroup from './GhostMenubarRadioGroup.vue'
import GhostMenubarRadioItem from './GhostMenubarRadioItem.vue'
import GhostMenubarTrigger from './GhostMenubarTrigger.vue'

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

function getHtmlPart(part: string): HTMLElement {
  const element = document.querySelector(`[data-part="${part}"]`)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected [data-part="${part}"] to be an HTMLElement`)
  }
  return element
}

function getMenubarTriggers(): [HTMLElement, HTMLElement] {
  const root = getHtmlPart('root')
  const triggers = Array.from(
    root.querySelectorAll<HTMLElement>('[data-part="trigger"]'),
  ).filter((trigger) => !trigger.hasAttribute('disabled'))
  const fileTrigger = triggers[0]
  const editTrigger = triggers[1]
  if (!(fileTrigger instanceof HTMLElement)) {
    throw new Error('Expected first menubar trigger')
  }
  if (!(editTrigger instanceof HTMLElement)) {
    throw new Error('Expected second menubar trigger')
  }
  return [fileTrigger, editTrigger]
}

function getDataValueSelector(value: string): HTMLElement {
  const element = document.querySelector(`[data-value="${value}"]`)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected [data-value="${value}"] to be an HTMLElement`)
  }
  return element
}

function stubFloatingPosition(): void {
  type ComputeResult = Awaited<ReturnType<typeof FloatingDom.computePosition>>
  computePositionOverride = () =>
    Promise.resolve({
      x: 0,
      y: 0,
      placement: 'bottom',
      strategy: 'absolute',
      middlewareData: {},
    } satisfies ComputeResult)
}

function mountFileEditMenubar(
  options: {
    fileDefaultOpen?: boolean
    editDefaultOpen?: boolean
  } = {},
): void {
  const checked = ref(false)
  const radio = ref('a')
  mountAttached(
    defineComponent({
      setup() {
        return () =>
          h(GhostMenubar, null, {
            default: () => [
              h(
                GhostMenubarMenu,
                options.fileDefaultOpen ? { defaultOpen: true } : null,
                {
                  default: () => [
                    h(GhostMenubarTrigger, null, () => 'File'),
                    h(GhostMenubarContent, null, () => [
                      h(GhostMenubarItem, null, () => 'New'),
                      h(GhostMenubarItem, null, () => 'Open'),
                    ]),
                  ],
                },
              ),
              h(
                GhostMenubarMenu,
                options.editDefaultOpen ? { defaultOpen: true } : null,
                {
                  default: () => [
                    h(GhostMenubarTrigger, null, () => 'Edit'),
                    h(GhostMenubarContent, null, () => [
                      h(
                        GhostMenubarCheckboxItem,
                        {
                          checked: checked.value,
                          'onUpdate:checked': (value: boolean) => {
                            checked.value = value
                          },
                        },
                        () => 'Show hidden',
                      ),
                      h(
                        GhostMenubarRadioGroup,
                        {
                          modelValue: radio.value,
                          'onUpdate:modelValue': (value: string) => {
                            radio.value = value
                          },
                        },
                        () => [
                          h(
                            GhostMenubarRadioItem,
                            { value: 'a' },
                            () => 'Option A',
                          ),
                          h(
                            GhostMenubarRadioItem,
                            { value: 'b' },
                            () => 'Option B',
                          ),
                        ],
                      ),
                    ]),
                  ],
                },
              ),
            ],
          })
      },
    }),
  )
}

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  computePositionOverride = null
})

describe('GhostMenubar', () => {
  it('sets role=menubar on the root and menuitem + aria-haspopup on triggers', () => {
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostMenubar, null, {
              default: () =>
                h(GhostMenubarMenu, null, {
                  default: () => [
                    h(GhostMenubarTrigger, null, () => 'File'),
                    h(GhostMenubarContent, null, () =>
                      h(GhostMenubarItem, null, () => 'New'),
                    ),
                  ],
                }),
            })
        },
      }),
    )

    const root = getHtmlPart('root')
    expect(root.getAttribute('role')).toBe('menubar')

    const trigger = getHtmlPart('trigger')
    expect(trigger.getAttribute('role')).toBe('menuitem')
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  it('keeps at most one menu open (opening Edit closes File)', async () => {
    stubFloatingPosition()
    mountFileEditMenubar()
    await flushPromises()

    const [fileTrigger, editTrigger] = getMenubarTriggers()
    fileTrigger.click()
    await flushPromises()

    expect(document.querySelectorAll('[data-part="content"]').length).toBe(1)
    expect(fileTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(editTrigger.getAttribute('aria-expanded')).toBe('false')

    editTrigger.click()
    await flushPromises()

    expect(document.querySelectorAll('[data-part="content"]').length).toBe(1)
    expect(fileTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(editTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(getHtmlPart('content').textContent).toContain('Show hidden')
  })

  it('opens with ArrowDown and focuses the first menu item', async () => {
    stubFloatingPosition()
    mountFileEditMenubar()
    await flushPromises()

    const [fileTrigger] = getMenubarTriggers()
    fileTrigger.focus()
    pressKey('ArrowDown', fileTrigger)
    await flushPromises()

    expect(fileTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
    expect(document.activeElement?.textContent).toBe('New')
  })

  it('uses a single roving tab stop among triggers', async () => {
    stubFloatingPosition()
    mountFileEditMenubar()
    await flushPromises()

    const [fileTrigger, editTrigger] = getMenubarTriggers()
    expect(fileTrigger.tabIndex).toBe(0)
    expect(editTrigger.tabIndex).toBe(-1)
  })

  it('ArrowRight with all menus closed moves focus without opening a menu', async () => {
    stubFloatingPosition()
    mountFileEditMenubar()
    await flushPromises()

    const [fileTrigger, editTrigger] = getMenubarTriggers()
    fileTrigger.focus()
    pressKey('ArrowRight', fileTrigger)
    await flushPromises()

    expect(document.activeElement).toBe(editTrigger)
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(editTrigger.tabIndex).toBe(0)
  })

  it('ArrowRight from inside menu content opens the adjacent menu', async () => {
    stubFloatingPosition()
    mountFileEditMenubar({ fileDefaultOpen: true })
    await flushPromises()

    const [fileTrigger, editTrigger] = getMenubarTriggers()
    const firstItem = getHtmlPart('item')
    firstItem.focus()
    pressKey('ArrowRight', firstItem)
    await flushPromises()

    expect(fileTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(editTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement?.textContent).toBe('Show hidden')
  })

  it('Tab from inside an open menu moves focus to the next tab stop after the menubar', async () => {
    stubFloatingPosition()
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('div', null, [
              h(GhostMenubar, null, {
                default: () => [
                  h(
                    GhostMenubarMenu,
                    { defaultOpen: true },
                    {
                      default: () => [
                        h(GhostMenubarTrigger, null, () => 'File'),
                        h(GhostMenubarContent, null, () =>
                          h(GhostMenubarItem, null, () => 'New'),
                        ),
                      ],
                    },
                  ),
                  h(GhostMenubarMenu, null, {
                    default: () => [
                      h(GhostMenubarTrigger, null, () => 'Edit'),
                      h(GhostMenubarContent, null, () =>
                        h(GhostMenubarItem, null, () => 'Cut'),
                      ),
                    ],
                  }),
                ],
              }),
              h(
                'button',
                { type: 'button', 'data-testid': 'after-menubar' },
                () => 'After',
              ),
            ])
        },
      }),
    )
    await flushPromises()

    const menuItem = document.querySelector('[data-part="item"]')
    expect(menuItem).not.toBeNull()
    ;(menuItem as HTMLElement).focus()

    pressKey('Tab', menuItem ?? document.body)
    await flushPromises()

    const after = document.querySelector('[data-testid="after-menubar"]')
    expect(document.activeElement).toBe(after)
    expect(document.querySelector('[data-part="content"]')).toBeNull()
  })

  it('hovering another trigger while a menu is open switches menus', async () => {
    stubFloatingPosition()
    mountFileEditMenubar({ fileDefaultOpen: true })
    await flushPromises()

    const [, editTrigger] = getMenubarTriggers()
    editTrigger.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true }),
    )
    await flushPromises()

    expect(editTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(getHtmlPart('content').textContent).toContain('Show hidden')
  })

  it('ArrowRight with an open menu moves to the next trigger and opens it', async () => {
    stubFloatingPosition()
    mountFileEditMenubar({ fileDefaultOpen: true })
    await flushPromises()

    const [fileTrigger, editTrigger] = getMenubarTriggers()
    fileTrigger.focus()
    pressKey('ArrowRight', fileTrigger)
    await flushPromises()

    expect(editTrigger.getAttribute('aria-expanded')).toBe('true')
    expect(fileTrigger.getAttribute('aria-expanded')).toBe('false')
    expect(getHtmlPart('content').textContent).toContain('Show hidden')
    expect(document.activeElement?.textContent).toBe('Show hidden')
  })

  it('closes on Escape and restores focus to the trigger', async () => {
    stubFloatingPosition()
    mountFileEditMenubar({ fileDefaultOpen: true })
    await flushPromises()

    const [fileTrigger] = getMenubarTriggers()
    fileTrigger.focus()

    pressKey('Escape')
    await flushPromises()

    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(fileTrigger)
  })

  it('checkbox item toggles without closing; radio item closes on select', async () => {
    stubFloatingPosition()
    const checked = ref(false)
    const radio = ref('a')

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostMenubar, null, {
              default: () =>
                h(
                  GhostMenubarMenu,
                  { defaultOpen: true },
                  {
                    default: () => [
                      h(GhostMenubarTrigger, null, () => 'Edit'),
                      h(GhostMenubarContent, null, () => [
                        h(
                          GhostMenubarCheckboxItem,
                          {
                            checked: checked.value,
                            'onUpdate:checked': (value: boolean) => {
                              checked.value = value
                            },
                          },
                          () => 'Show hidden',
                        ),
                        h(
                          GhostMenubarRadioGroup,
                          {
                            modelValue: radio.value,
                            'onUpdate:modelValue': (value: string) => {
                              radio.value = value
                            },
                          },
                          () => [
                            h(
                              GhostMenubarRadioItem,
                              { value: 'a' },
                              () => 'Option A',
                            ),
                            h(
                              GhostMenubarRadioItem,
                              { value: 'b' },
                              () => 'Option B',
                            ),
                          ],
                        ),
                      ]),
                    ],
                  },
                ),
            })
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

  it('typeahead moves roving focus among items', async () => {
    stubFloatingPosition()
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostMenubar, null, {
              default: () =>
                h(
                  GhostMenubarMenu,
                  { defaultOpen: true },
                  {
                    default: () => [
                      h(GhostMenubarTrigger, null, () => 'File'),
                      h(GhostMenubarContent, null, () => [
                        h(GhostMenubarItem, null, () => 'Apple'),
                        h(GhostMenubarItem, null, () => 'Banana'),
                        h(GhostMenubarItem, null, () => 'Cherry'),
                      ]),
                    ],
                  },
                ),
            })
        },
      }),
    )
    await flushPromises()

    const content = getHtmlPart('content')
    pressKey('b', content)
    expect(document.activeElement?.textContent).toBe('Banana')
    await new Promise((resolve) => setTimeout(resolve, 510))
    pressKey('c', content)
    expect(document.activeElement?.textContent).toBe('Cherry')
  })
})
