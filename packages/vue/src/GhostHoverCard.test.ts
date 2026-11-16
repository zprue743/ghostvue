import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GhostButton from './GhostButton.vue'
import GhostHoverCard from './GhostHoverCard.vue'
import GhostHoverCardContent from './GhostHoverCardContent.vue'
import GhostHoverCardTrigger from './GhostHoverCardTrigger.vue'
import {
  hoverCardFocusStaysInside,
  type GhostHoverCardContentExposed,
  type GhostHoverCardTriggerExposed,
} from './ghost-hover-card'

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

function pointerDown(target: EventTarget): void {
  target.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
  )
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  computePositionOverride = null
  vi.useRealTimers()
})

describe('ghost-hover-card helpers', () => {
  it('detects when focus moves between trigger and content', () => {
    const host = document.createElement('div')
    const trigger = document.createElement('button')
    const content = document.createElement('div')
    const inner = document.createElement('a')
    host.append(trigger, content)
    content.append(inner)

    expect(hoverCardFocusStaysInside(inner, trigger, content)).toBe(true)
    expect(
      hoverCardFocusStaysInside(
        document.createElement('span'),
        trigger,
        content,
      ),
    ).toBe(false)
  })
})

describe('GhostHoverCard', () => {
  it('opens after delay on pointer/focus and wires dialog semantics', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              { openDelay: 300, closeDelay: 0 },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'hc-trigger' },
                    () => 'Anchor',
                  ),
                  h(GhostHoverCardContent, { id: 'hc-content' }, () => [
                    h('a', { href: '#profile' }, 'View profile'),
                  ]),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#hc-trigger')
    await trigger.trigger('pointerenter')
    vi.advanceTimersByTime(299)
    expect(document.querySelector('#hc-content')).toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()

    const content = document.querySelector<HTMLElement>('#hc-content')
    expect(content).not.toBeNull()
    expect(content?.getAttribute('role')).toBe('dialog')
    expect(content?.querySelector('a')).not.toBeNull()
    expect(trigger.attributes('aria-haspopup')).toBe('dialog')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(trigger.attributes('aria-controls')).toBe('hc-content')
    expect(trigger.attributes('data-state')).toBe('open')
  })

  it('honors closeDelay on pointer leave and closes on Escape', async () => {
    const updates: boolean[] = []
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                openDelay: 0,
                closeDelay: 200,
                'onUpdate:open': (open: boolean) => updates.push(open),
              },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'leave-trigger' },
                    () => 'Term',
                  ),
                  h(
                    GhostHoverCardContent,
                    { id: 'leave-content' },
                    () => 'Note',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#leave-trigger')
    trigger?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#leave-content')).not.toBeNull()

    trigger?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    vi.advanceTimersByTime(199)
    expect(document.querySelector('#leave-content')).not.toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#leave-content')).toBeNull()
    expect(updates).toEqual([true, false])

    trigger?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    pressKey('Escape')
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#leave-content')).toBeNull()
  })

  it('does not schedule show when the trigger is disabled', async () => {
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              { openDelay: 0 },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { disabled: true, id: 'disabled-trigger' },
                    () => 'Off',
                  ),
                  h(GhostHoverCardContent, null, () => 'Never'),
                ],
              },
            )
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#disabled-trigger')
    trigger?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    trigger?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    vi.runAllTimers()
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('supports controlled open and clears timers on unmount', () => {
    const open = ref(true)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                open: open.value,
                openDelay: 500,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'controlled-trigger' },
                    () => 'X',
                  ),
                  h(GhostHoverCardContent, null, () => 'Controlled'),
                ],
              },
            )
        },
      }),
    )

    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
    wrapper.unmount()
    vi.runAllTimers()
  })

  it('cancels close when pointer enters hoverable content during closeDelay', async () => {
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              { openDelay: 0, closeDelay: 200 },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'hoverable-trigger' },
                    () => 'Move',
                  ),
                  h(
                    GhostHoverCardContent,
                    { id: 'hoverable-content' },
                    () => 'Hoverable',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#hoverable-trigger')
    trigger?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    trigger?.dispatchEvent(new PointerEvent('pointerleave', { bubbles: true }))
    vi.advanceTimersByTime(50)

    const content = document.querySelector<HTMLElement>('#hoverable-content')
    content?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.advanceTimersByTime(500)
    await flushPromises()
    await nextTick()

    expect(document.querySelector('#hoverable-content')).not.toBeNull()
    expect(content?.getAttribute('data-hoverable')).toBe('')
  })

  it('dismisses on outside pointerdown', async () => {
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('div', [
              h('button', { id: 'outside-button', type: 'button' }, 'Outside'),
              h(
                GhostHoverCard,
                { openDelay: 0, closeDelay: 0 },
                {
                  default: () => [
                    h(
                      GhostHoverCardTrigger,
                      { id: 'dismiss-trigger' },
                      () => 'T',
                    ),
                    h(
                      GhostHoverCardContent,
                      { id: 'dismiss-content' },
                      () => 'Card',
                    ),
                  ],
                },
              ),
            ])
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#dismiss-trigger')
    trigger?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#dismiss-content')).not.toBeNull()

    const outside = document.querySelector<HTMLElement>('#outside-button')
    if (!outside) {
      throw new Error('Expected outside button')
    }
    pointerDown(outside)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#dismiss-content')).toBeNull()
  })

  it('emits update:open even when a controlled parent ignores the emit', async () => {
    const open = ref(true)
    const emitted: boolean[] = []
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                open: open.value,
                openDelay: 0,
                'onUpdate:open': (next: boolean) => emitted.push(next),
              },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'ignore-trigger-2' },
                    () => 'I',
                  ),
                  h(
                    GhostHoverCardContent,
                    { id: 'ignore-content-2' },
                    () => 'C',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#ignore-trigger-2')
    trigger?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    pressKey('Escape')
    await flushPromises()
    await nextTick()
    expect(emitted).toContain(false)
    expect(open.value).toBe(true)
    expect(document.querySelector('#ignore-content-2')).not.toBeNull()
  })

  it('renders inline without portal and opens on focusin', async () => {
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              'div',
              { id: 'host' },
              h(
                GhostHoverCard,
                { openDelay: 0 },
                {
                  default: () => [
                    h(
                      GhostHoverCardTrigger,
                      { id: 'focus-trigger' },
                      () => 'F',
                    ),
                    h(
                      GhostHoverCardContent,
                      { id: 'focus-content', portal: false },
                      () => 'Focus card',
                    ),
                  ],
                },
              ),
            )
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#focus-trigger')
    trigger?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    const content = document.querySelector('#focus-content')
    expect(content).not.toBeNull()
    expect(document.querySelector('#host')?.contains(content ?? null)).toBe(
      true,
    )
  })

  it('exposes focus and blur helpers on trigger and content refs', async () => {
    const triggerRef = ref<GhostHoverCardTriggerExposed | null>(null)
    const contentRef = ref<GhostHoverCardContentExposed | null>(null)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              { openDelay: 0 },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { ref: triggerRef, id: 'expose-trigger' },
                    () => 'Expose',
                  ),
                  h(
                    GhostHoverCardContent,
                    { ref: contentRef, id: 'expose-content' },
                    () => 'Expose body',
                  ),
                ],
              },
            )
        },
      }),
    )

    document
      .querySelector<HTMLElement>('#expose-trigger')
      ?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    triggerRef.value?.focus()
    triggerRef.value?.blur()
    contentRef.value?.focus()
    contentRef.value?.blur()
    expect(contentRef.value?.element?.id).toBe('expose-content')
  })

  it('resolves GhostButton as trigger element for floating anchor', async () => {
    const triggerRef = ref<GhostHoverCardTriggerExposed | null>(null)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              { openDelay: 0 },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { ref: triggerRef, as: GhostButton },
                    () => 'Wrapped',
                  ),
                  h(GhostHoverCardContent, null, () => 'Wrapped preview'),
                ],
              },
            )
        },
      }),
    )

    await nextTick()
    const el = triggerRef.value?.element
    expect(el?.tagName).toBe('BUTTON')
  })

  it('cancels pending open when pointer leaves before delay', async () => {
    const updates: boolean[] = []
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                openDelay: 300,
                closeDelay: 0,
                'onUpdate:open': (open: boolean) => updates.push(open),
              },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'cancel-pointer-trigger' },
                    () => 'Anchor',
                  ),
                  h(
                    GhostHoverCardContent,
                    { id: 'cancel-pointer-content' },
                    () => 'Preview',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#cancel-pointer-trigger')
    await trigger.trigger('pointerenter')
    vi.advanceTimersByTime(150)
    await trigger.trigger('pointerleave')

    vi.advanceTimersByTime(300)
    await flushPromises()
    await nextTick()

    expect(document.querySelector('#cancel-pointer-content')).toBeNull()
    expect(updates).toEqual([])
  })

  it('cancels pending open when focus leaves before delay', async () => {
    const updates: boolean[] = []
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                openDelay: 300,
                closeDelay: 0,
                'onUpdate:open': (open: boolean) => updates.push(open),
              },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'cancel-focus-trigger' },
                    () => 'Anchor',
                  ),
                  h(
                    GhostHoverCardContent,
                    { id: 'cancel-focus-content' },
                    () => 'Preview',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#cancel-focus-trigger')
    await trigger.trigger('focusin')
    vi.advanceTimersByTime(150)
    await trigger.trigger('focusout')

    vi.advanceTimersByTime(300)
    await flushPromises()
    await nextTick()

    expect(document.querySelector('#cancel-focus-content')).toBeNull()
    expect(updates).toEqual([])
  })

  it('keeps pending open while another activation source remains active, then cancels once all leave', async () => {
    const updates: boolean[] = []
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                openDelay: 300,
                closeDelay: 0,
                'onUpdate:open': (open: boolean) => updates.push(open),
              },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'multi-source-trigger' },
                    () => 'Anchor',
                  ),
                  h(
                    GhostHoverCardContent,
                    { id: 'multi-source-content' },
                    () => 'Preview',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#multi-source-trigger')
    await trigger.trigger('pointerenter')
    await trigger.trigger('focusin')
    vi.advanceTimersByTime(150)
    await trigger.trigger('pointerleave')

    vi.advanceTimersByTime(150)
    await flushPromises()
    await nextTick()

    expect(document.querySelector('#multi-source-content')).not.toBeNull()
    expect(updates).toEqual([true])

    await trigger.trigger('focusout')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#multi-source-content')).toBeNull()

    await trigger.trigger('pointerenter')
    await trigger.trigger('focusin')
    vi.advanceTimersByTime(100)
    await trigger.trigger('pointerleave')
    await trigger.trigger('focusout')

    vi.advanceTimersByTime(300)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#multi-source-content')).toBeNull()
    expect(updates).toEqual([true, false])
  })

  it('releases trigger focus on trigger-to-content transfer and closes when focus leaves content', async () => {
    const updates: boolean[] = []
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('div', [
              h(
                GhostHoverCard,
                {
                  openDelay: 0,
                  closeDelay: 100,
                  'onUpdate:open': (open: boolean) => updates.push(open),
                },
                {
                  default: () => [
                    h(
                      GhostHoverCardTrigger,
                      { id: 'transfer-trigger' },
                      () => 'Anchor',
                    ),
                    h(GhostHoverCardContent, { id: 'transfer-content' }, () => [
                      h('a', { id: 'transfer-link', href: '#a' }, 'Link'),
                      h(
                        'button',
                        { id: 'transfer-btn', type: 'button' },
                        'Action',
                      ),
                    ]),
                  ],
                },
              ),
              h(
                'button',
                { id: 'transfer-outside', type: 'button' },
                'Outside',
              ),
            ])
        },
      }),
    )

    const requireEl = (selector: string): HTMLElement => {
      const el = document.querySelector<HTMLElement>(selector)
      if (!el) {
        throw new Error(`Expected element ${selector}`)
      }
      return el
    }

    const trigger = requireEl('#transfer-trigger')
    const outside = requireEl('#transfer-outside')

    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    const link = requireEl('#transfer-link')
    const btn = requireEl('#transfer-btn')
    expect(document.querySelector('#transfer-content')).not.toBeNull()

    // Move focus from trigger into content child
    trigger.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: link }),
    )
    link.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: trigger }),
    )
    vi.advanceTimersByTime(200)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#transfer-content')).not.toBeNull()

    // Move focus between descendants inside content
    link.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: btn }),
    )
    btn.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: link }),
    )
    vi.advanceTimersByTime(200)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#transfer-content')).not.toBeNull()

    // Move focus from content child to outside element
    btn.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
    )
    outside.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: btn }),
    )
    vi.advanceTimersByTime(99)
    expect(document.querySelector('#transfer-content')).not.toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#transfer-content')).toBeNull()
    expect(updates).toEqual([true, false])
  })

  it('releases content focus on content-to-trigger transfer and closes when focus leaves trigger', async () => {
    const updates: boolean[] = []
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h('div', [
              h(
                GhostHoverCard,
                {
                  openDelay: 0,
                  closeDelay: 50,
                  'onUpdate:open': (open: boolean) => updates.push(open),
                },
                {
                  default: () => [
                    h(
                      GhostHoverCardTrigger,
                      { id: 'reverse-trigger' },
                      () => 'Anchor',
                    ),
                    h(GhostHoverCardContent, { id: 'reverse-content' }, () => [
                      h('a', { id: 'reverse-link', href: '#a' }, 'Link'),
                    ]),
                  ],
                },
              ),
              h('button', { id: 'reverse-outside', type: 'button' }, 'Outside'),
            ])
        },
      }),
    )

    const requireEl = (selector: string): HTMLElement => {
      const el = document.querySelector<HTMLElement>(selector)
      if (!el) {
        throw new Error(`Expected element ${selector}`)
      }
      return el
    }

    const trigger = requireEl('#reverse-trigger')
    const outside = requireEl('#reverse-outside')

    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    const link = requireEl('#reverse-link')

    // Trigger -> content
    trigger.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: link }),
    )
    link.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: trigger }),
    )
    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(document.querySelector('#reverse-content')).not.toBeNull()

    // Content -> trigger
    link.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: trigger }),
    )
    trigger.dispatchEvent(
      new FocusEvent('focusin', { bubbles: true, relatedTarget: link }),
    )
    vi.advanceTimersByTime(100)
    await flushPromises()
    expect(document.querySelector('#reverse-content')).not.toBeNull()

    // Trigger -> outside
    trigger.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
    )
    vi.advanceTimersByTime(50)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#reverse-content')).toBeNull()
    expect(updates).toEqual([true, false])
  })
})
