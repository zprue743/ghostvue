import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GhostButton from './GhostButton.vue'
import GhostTooltip from './GhostTooltip.vue'
import GhostTooltipContent from './GhostTooltipContent.vue'
import GhostTooltipTrigger from './GhostTooltipTrigger.vue'
import {
  mergeTooltipDescribedBy,
  type GhostTooltipContentExposed,
  type GhostTooltipTriggerExposed,
} from './ghost-tooltip'

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

describe('GhostTooltip', () => {
  it('merges consumer aria-describedby with tooltip content id when open', () => {
    expect(mergeTooltipDescribedBy('field-help', 'tip-id', false)).toBe(
      'field-help',
    )
    expect(mergeTooltipDescribedBy('field-help', 'tip-id', true)).toBe(
      'field-help tip-id',
    )
    expect(mergeTooltipDescribedBy('field-help tip-id', 'tip-id', true)).toBe(
      'field-help tip-id',
    )
  })

  it('preserves consumer aria-describedby on the trigger when closed and merges while open', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              { delayDuration: 0, closeDelay: 0 },
              {
                default: () => [
                  h(
                    GhostTooltipTrigger,
                    {
                      id: 'merge-trigger',
                      'aria-describedby': 'field-help',
                    },
                    () => 'Label',
                  ),
                  h(
                    GhostTooltipContent,
                    { id: 'merge-content' },
                    () => 'Extra',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#merge-trigger')
    expect(trigger.attributes('aria-describedby')).toBe('field-help')

    await trigger.trigger('pointerenter')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    expect(trigger.attributes('aria-describedby')).toBe(
      'field-help merge-content',
    )
  })

  it('opens after delay on pointer/focus and wires aria-describedby and role=tooltip', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              { delayDuration: 300, closeDelay: 0 },
              {
                default: () => [
                  h(GhostTooltipTrigger, { id: 'tt-trigger' }, () => 'Anchor'),
                  h(
                    GhostTooltipContent,
                    { id: 'tt-content' },
                    () => 'Supplemental hint',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#tt-trigger')
    await trigger.trigger('pointerenter')
    vi.advanceTimersByTime(299)
    expect(document.querySelector('#tt-content')).toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()

    const content = document.querySelector<HTMLElement>('#tt-content')
    expect(content).not.toBeNull()
    expect(content?.getAttribute('role')).toBe('tooltip')
    expect(content?.textContent).toBe('Supplemental hint')
    expect(trigger.attributes('aria-describedby')).toBe('tt-content')
    expect(trigger.attributes('data-state')).toBe('open')
  })

  it('honors closeDelay on pointer leave and closes on Escape', async () => {
    const updates: boolean[] = []
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              {
                delayDuration: 0,
                closeDelay: 200,
                'onUpdate:open': (open: boolean) => updates.push(open),
              },
              {
                default: () => [
                  h(GhostTooltipTrigger, { id: 'leave-trigger' }, () => 'Term'),
                  h(GhostTooltipContent, { id: 'leave-content' }, () => 'Note'),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#leave-trigger')
    await trigger.trigger('pointerenter')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#leave-content')).not.toBeNull()

    await trigger.trigger('pointerleave')
    vi.advanceTimersByTime(199)
    expect(document.querySelector('#leave-content')).not.toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#leave-content')).toBeNull()
    expect(updates).toEqual([true, false])

    await trigger.trigger('pointerenter')
    await flushPromises()
    await nextTick()
    pressKey('Escape')
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#leave-content')).toBeNull()
  })

  it('does not schedule show when the trigger is disabled', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              { delayDuration: 0 },
              {
                default: () => [
                  h(
                    GhostTooltipTrigger,
                    { disabled: true, id: 'disabled-trigger' },
                    () => 'Off',
                  ),
                  h(GhostTooltipContent, null, () => 'Never'),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#disabled-trigger')
    await trigger.trigger('pointerenter')
    await trigger.trigger('focusin')
    vi.runAllTimers()
    await flushPromises()
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('supports controlled open and clears timers on unmount', () => {
    const open = ref(true)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              {
                open: open.value,
                delayDuration: 500,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              {
                default: () => [
                  h(
                    GhostTooltipTrigger,
                    { id: 'controlled-trigger' },
                    () => 'X',
                  ),
                  h(GhostTooltipContent, null, () => 'Controlled'),
                ],
              },
            )
        },
      }),
    )

    expect(document.querySelector('[role="tooltip"]')).not.toBeNull()
    wrapper.unmount()
    vi.runAllTimers()
  })

  it('stays open while the trigger stays focused after pointer leave', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              { delayDuration: 0, closeDelay: 200 },
              {
                default: () => [
                  h(
                    GhostTooltipTrigger,
                    { id: 'focus-stay-trigger' },
                    () => 'Focus',
                  ),
                  h(
                    GhostTooltipContent,
                    { id: 'focus-stay-content' },
                    () => 'Hint',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#focus-stay-trigger')
    await trigger.trigger('focusin')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#focus-stay-content')).not.toBeNull()

    await trigger.trigger('pointerleave')
    vi.advanceTimersByTime(400)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#focus-stay-content')).not.toBeNull()
  })

  it('cancels close when pointer enters hoverable content during closeDelay', async () => {
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              { delayDuration: 0, closeDelay: 200 },
              {
                default: () => [
                  h(
                    GhostTooltipTrigger,
                    { id: 'hoverable-trigger' },
                    () => 'Move',
                  ),
                  h(
                    GhostTooltipContent,
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

  it('hides immediately when disableHoverableContent is true', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              {
                delayDuration: 0,
                disableHoverableContent: true,
              },
              {
                default: () => [
                  h(GhostTooltipTrigger, { id: 'instant-trigger' }, () => 'Go'),
                  h(
                    GhostTooltipContent,
                    { id: 'instant-content' },
                    () => 'Tip',
                  ),
                ],
              },
            )
        },
      }),
    )

    const trigger = wrapper.get('#instant-trigger')
    await trigger.trigger('pointerenter')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#instant-content')).not.toBeNull()

    await trigger.trigger('pointerleave')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#instant-content')).toBeNull()
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
                GhostTooltip,
                { delayDuration: 0 },
                {
                  default: () => [
                    h(GhostTooltipTrigger, { id: 'focus-trigger' }, () => 'F'),
                    h(
                      GhostTooltipContent,
                      { id: 'focus-content', portal: false },
                      () => 'Focus tip',
                    ),
                  ],
                },
              ),
            )
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#focus-trigger')
    expect(trigger).not.toBeNull()
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
    const triggerRef = ref<GhostTooltipTriggerExposed | null>(null)
    const contentRef = ref<GhostTooltipContentExposed | null>(null)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              { delayDuration: 0 },
              {
                default: () => [
                  h(
                    GhostTooltipTrigger,
                    { ref: triggerRef, id: 'expose-trigger' },
                    () => 'Expose',
                  ),
                  h(
                    GhostTooltipContent,
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
    const triggerRef = ref<GhostTooltipTriggerExposed | null>(null)
    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltip,
              { delayDuration: 0 },
              {
                default: () => [
                  h(
                    GhostTooltipTrigger,
                    { ref: triggerRef, as: GhostButton },
                    () => 'Wrapped',
                  ),
                  h(GhostTooltipContent, null, () => 'Wrapped hint'),
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
})
