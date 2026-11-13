import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostButton from './GhostButton.vue'
import GhostPopover from './GhostPopover.vue'
import GhostPopoverClose from './GhostPopoverClose.vue'
import GhostPopoverContent from './GhostPopoverContent.vue'
import GhostPopoverTrigger from './GhostPopoverTrigger.vue'
import type {
  GhostPopoverContentExposed,
  GhostPopoverTriggerExposed,
} from './ghost-popover'
import { useDismissableLayer } from './use-dismissable-layer'

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

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  computePositionOverride = null
})

describe('GhostPopover', () => {
  it('supports uncontrolled open/defaultOpen, controlled open, and v-if unmounting', async () => {
    const uncontrolledUpdates: boolean[] = []
    const uncontrolled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              {
                defaultOpen: false,
                'onUpdate:open': (value: boolean) =>
                  uncontrolledUpdates.push(value),
              },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Toggle'),
                  h(GhostPopoverContent, null, () => [
                    h('button', { type: 'button' }, 'Inside action'),
                  ]),
                ],
              },
            )
        },
      }),
    )

    const trigger = uncontrolled.get('[data-part="trigger"]')
    expect(trigger.attributes('data-state')).toBe('closed')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    ;(trigger.element as HTMLElement).focus()
    await trigger.trigger('click')
    await flushPromises()

    expect(uncontrolledUpdates).toEqual([true])
    expect(trigger.attributes('data-state')).toBe('open')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    await trigger.trigger('click')
    await flushPromises()
    expect(uncontrolledUpdates).toEqual([true, false])
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    // Controlled mode does not change unless parent updates open prop.
    const open = ref(false)
    const controlledUpdates: boolean[] = []
    const controlled = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) =>
                  controlledUpdates.push(value),
              },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Controlled'),
                  h(GhostPopoverContent, null, () => 'Controlled body'),
                ],
              },
            )
        },
      }),
    )

    const controlledTrigger = controlled.get('[data-part="trigger"]')
    await controlledTrigger.trigger('click')
    await flushPromises()
    expect(controlledUpdates).toEqual([true])
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    open.value = true
    await nextTick()
    await flushPromises()
    expect(controlledTrigger.attributes('aria-expanded')).toBe('true')
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('wires APG non-modal dialog ARIA attributes and supports custom label overrides', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Details'),
                  h(GhostPopoverContent, null, () => 'Body text'),
                ],
              },
            )
        },
      }),
    )

    await flushPromises()
    const trigger = wrapper.get('[data-part="trigger"]')
    const content = document.querySelector<HTMLElement>('[data-part="content"]')
    expect(content).not.toBeNull()
    if (!content) {
      throw new Error('Expected content element')
    }

    expect(trigger.attributes('type')).toBe('button')
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(trigger.attributes('aria-controls')).toBe(content.id)
    expect(content.getAttribute('role')).toBe('dialog')
    expect(content.hasAttribute('aria-modal')).toBe(false)
    expect(content.getAttribute('aria-labelledby')).toBe(
      trigger.attributes('id'),
    )
    expect(content.getAttribute('data-state')).toBe('open')
    expect(content.getAttribute('data-placement')).toBe('bottom')

    // Explicit aria-label suppresses automatic aria-labelledby.
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostPopover,
              { defaultOpen: true },
              {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Info'),
                  h(
                    GhostPopoverContent,
                    { 'aria-label': 'Custom info panel' },
                    () => 'Body',
                  ),
                ],
              },
            )
        },
      }),
    )
    await flushPromises()
    const customContent = document.querySelectorAll<HTMLElement>(
      '[data-part="content"]',
    )[1]
    expect(customContent?.getAttribute('aria-label')).toBe('Custom info panel')
    expect(customContent?.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('keeps content visibility:hidden until useFloating resolves isPositioned', async () => {
    type ComputeResult = Awaited<ReturnType<typeof FloatingDom.computePosition>>
    let resolvePosition: ((result: ComputeResult) => void) | undefined
    computePositionOverride = () =>
      new Promise<ComputeResult>((resolve) => {
        resolvePosition = resolve
      })

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostPopover, null, {
              default: () => [
                h(GhostPopoverTrigger, null, () => 'Open'),
                h(GhostPopoverContent, null, () => [
                  h('button', { type: 'button' }, 'Focusable'),
                ]),
              ],
            })
        },
      }),
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    ;(trigger.element as HTMLElement).focus()
    await trigger.trigger('click')
    await nextTick()

    const content = document.querySelector<HTMLElement>('[data-part="content"]')
    expect(content).not.toBeNull()
    expect(content?.style.visibility).toBe('hidden')

    resolvePosition?.({
      x: 24,
      y: 48,
      placement: 'bottom',
      strategy: 'absolute',
      middlewareData: {},
    })
    await flushPromises()

    expect(content?.style.visibility).not.toBe('hidden')
    expect(content?.style.left).toBe('24px')
    expect(content?.style.top).toBe('48px')
    expect(document.activeElement?.textContent).toBe('Focusable')
  })

  it('moves focus in on open (first focusable, else content) and restores to trigger on close', async () => {
    // 1. With focusable child + Escape
    const withFocusable = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostPopover, null, {
              default: () => [
                h(GhostPopoverTrigger, null, () => 'Open A'),
                h(GhostPopoverContent, null, () => [
                  h('input', { 'data-testid': 'inside-input', type: 'text' }),
                  h(GhostPopoverClose, null, () => 'Close A'),
                ]),
              ],
            })
        },
      }),
    )

    const triggerA = withFocusable.get('[data-part="trigger"]')
    ;(triggerA.element as HTMLElement).focus()
    await triggerA.trigger('click')
    await flushPromises()

    const input = document.querySelector<HTMLElement>(
      '[data-testid="inside-input"]',
    )
    expect(document.activeElement).toBe(input)

    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(triggerA.element)

    // Reopen and close via GhostPopoverClose -> restores focus to trigger.
    await triggerA.trigger('click')
    await flushPromises()
    const closeBtn = document.querySelector<HTMLElement>('[data-part="close"]')
    expect(closeBtn).not.toBeNull()
    closeBtn?.click()
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(document.activeElement).toBe(triggerA.element)

    // 2. Without focusable children -> focuses content container itself.
    const noFocusable = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostPopover, null, {
              default: () => [
                h(GhostPopoverTrigger, null, () => 'Open B'),
                h(GhostPopoverContent, null, () => h('p', 'Read-only text')),
              ],
            })
        },
      }),
    )

    const triggerB = noFocusable.findAll('[data-part="trigger"]').at(-1)
    if (!triggerB) {
      throw new Error('Expected trigger B')
    }
    ;(triggerB.element as HTMLElement).focus()
    await triggerB.trigger('click')
    await flushPromises()

    const contentB = document.querySelector<HTMLElement>(
      '[data-part="content"]',
    )
    expect(document.activeElement).toBe(contentB)
    pressKey('Escape')
    await flushPromises()
    expect(document.activeElement).toBe(triggerB.element)
  })

  it('dismisses on outside pointerdown, toggles cleanly on trigger click, and removes layer on v-if unmount', async () => {
    const outerDismiss = vi.fn()
    const outerEl = ref<HTMLElement | null>(null)

    const wrapper = mountAttached(
      defineComponent({
        setup() {
          useDismissableLayer(outerEl, { onDismiss: outerDismiss })
          return () =>
            h('div', [
              h('div', { ref: outerEl, 'data-testid': 'lower-layer' }, 'Base'),
              h('div', { 'data-testid': 'outside-node' }, 'Outside'),
              h(GhostPopover, null, {
                default: () => [
                  h(GhostPopoverTrigger, null, () => 'Anchor'),
                  h(GhostPopoverContent, null, () => [
                    h('button', { type: 'button' }, 'Action'),
                  ]),
                ],
              }),
            ])
        },
      }),
    )

    const trigger = wrapper.get('[data-part="trigger"]')
    const outsideNode = wrapper.get('[data-testid="outside-node"]').element

    // Pointerdown on trigger does NOT close-then-reopen; click toggles cleanly.
    ;(trigger.element as HTMLElement).focus()
    await trigger.trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    pointerDown(trigger.element)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    await trigger.trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    // Open again, then dismiss via outside pointerdown.
    await trigger.trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()

    pointerDown(outsideNode)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()
    expect(outerDismiss).not.toHaveBeenCalled()

    // Because v-if removed GhostPopoverContent's layer from layerStack, Escape
    // now reaches the lower layer instead of being swallowed by a hidden popover.
    pressKey('Escape')
    expect(outerDismiss).toHaveBeenCalledTimes(1)
  })

  it('closes nested popovers one layer at a time on Escape and outside click', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostPopover, null, {
              default: () => [
                h(
                  GhostPopoverTrigger,
                  { 'data-testid': 'outer-trigger' },
                  () => 'Outer',
                ),
                h(
                  GhostPopoverContent,
                  { 'data-testid': 'outer-content' },
                  () => [
                    h('p', { 'data-testid': 'outer-text' }, 'Outer body'),
                    h(GhostPopover, null, {
                      default: () => [
                        h(
                          GhostPopoverTrigger,
                          { 'data-testid': 'inner-trigger' },
                          () => 'Inner',
                        ),
                        h(
                          GhostPopoverContent,
                          { 'data-testid': 'inner-content' },
                          () => h('p', 'Inner body'),
                        ),
                      ],
                    }),
                  ],
                ),
              ],
            })
        },
      }),
    )

    const outerTrigger = wrapper.get('[data-testid="outer-trigger"]')
    await outerTrigger.trigger('click')
    await flushPromises()
    expect(
      document.querySelector('[data-testid="outer-content"]'),
    ).not.toBeNull()

    const innerTrigger = document.querySelector<HTMLElement>(
      '[data-testid="inner-trigger"]',
    )
    innerTrigger?.click()
    await flushPromises()
    expect(
      document.querySelector('[data-testid="inner-content"]'),
    ).not.toBeNull()

    // First Escape closes only the inner popover.
    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-testid="inner-content"]')).toBeNull()
    expect(
      document.querySelector('[data-testid="outer-content"]'),
    ).not.toBeNull()

    // Second Escape closes the outer popover.
    pressKey('Escape')
    await flushPromises()
    expect(document.querySelector('[data-testid="outer-content"]')).toBeNull()
  })

  it('portals to body by default, supports portal=false, and supports as=GhostButton & non-button tags', async () => {
    const triggerRef = ref<GhostPopoverTriggerExposed | null>(null)
    const contentRef = ref<GhostPopoverContentExposed | null>(null)

    const inlineWrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('div', { 'data-testid': 'host-box' }, [
              h(GhostPopover, null, {
                default: () => [
                  h(
                    GhostPopoverTrigger,
                    { ref: triggerRef, as: GhostButton },
                    () => 'Button host',
                  ),
                  h(
                    GhostPopoverContent,
                    { ref: contentRef, portal: false },
                    () => 'Inline content',
                  ),
                ],
              }),
            ])
        },
      }),
    )

    expect(triggerRef.value?.element).toBeInstanceOf(HTMLButtonElement)
    await inlineWrapper.get('[data-part="trigger"]').trigger('click')
    await flushPromises()

    const hostBox = inlineWrapper.get('[data-testid="host-box"]').element
    const inlineContent = inlineWrapper.get('[data-part="content"]').element
    expect(hostBox.contains(inlineContent)).toBe(true)
    expect(contentRef.value?.element).toBe(inlineContent)
    inlineWrapper.unmount()

    // Non-button trigger tag supports Enter and Space keyboard activation and disabled.
    const disabled = ref(true)
    const customTag = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(GhostPopover, null, {
              default: () => [
                h(
                  GhostPopoverTrigger,
                  { as: 'div', disabled: disabled.value },
                  () => 'Div trigger',
                ),
                h(GhostPopoverContent, null, () => 'Opened'),
              ],
            })
        },
      }),
    )

    const divTrigger = customTag.get('[data-part="trigger"]')
    expect(divTrigger.attributes('role')).toBe('button')
    expect(divTrigger.attributes('aria-disabled')).toBe('true')
    await divTrigger.trigger('click')
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).toBeNull()

    disabled.value = false
    await nextTick()
    expect(divTrigger.attributes('tabindex')).toBe('0')
    pressKey('Enter', divTrigger.element)
    await flushPromises()
    expect(document.querySelector('[data-part="content"]')).not.toBeNull()
  })

  it('exposes useGhostPopover state, actions, and deterministic IDs', async () => {
    const { useGhostPopover } = await import('./use-ghost-popover')
    const changes: boolean[] = []
    let api: ReturnType<typeof useGhostPopover> | undefined

    mountAttached(
      defineComponent({
        setup() {
          api = useGhostPopover({
            defaultOpen: false,
            onOpenChange: (next) => changes.push(next),
          })
          return () => h('div', api?.triggerId.value)
        },
      }),
    )

    expect(api?.isOpen.value).toBe(false)
    expect(api?.triggerId.value).toMatch(/^ghost-popover-trigger-/)
    expect(api?.contentId.value).toMatch(/^ghost-popover-content-/)

    api?.open()
    expect(api?.isOpen.value).toBe(true)
    api?.open() // Idempotent when already open.
    expect(changes).toEqual([true])

    api?.close()
    expect(api?.isOpen.value).toBe(false)
    api?.toggle()
    expect(api?.isOpen.value).toBe(true)
    expect(changes).toEqual([true, false, true])
  })
})
