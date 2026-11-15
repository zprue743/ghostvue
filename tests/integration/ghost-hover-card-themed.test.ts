import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
  type GhostHoverCardContentExposed,
  type GhostHoverCardTriggerExposed,
} from '../../packages/themes/src/index'

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
  vi.useRealTimers()
})

describe('themed GhostHoverCard wrappers', () => {
  it('forwards delay props and exposes trigger/content elements', async () => {
    vi.useFakeTimers()
    const trigger = ref<GhostHoverCardTriggerExposed | null>(null)
    const content = ref<GhostHoverCardContentExposed | null>(null)

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
                    {
                      ref: trigger,
                      'data-testid': 'themed-hc-trigger',
                    },
                    () => 'Preview anchor',
                  ),
                  h(
                    GhostHoverCardContent,
                    {
                      ref: content,
                      'data-testid': 'themed-hc-content',
                    },
                    () => 'Preview body',
                  ),
                ],
              },
            )
        },
      }),
    )

    expect(trigger.value?.element).toBe(
      document.querySelector('[data-testid="themed-hc-trigger"]'),
    )

    trigger.value?.element?.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true }),
    )
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    const mounted = document.querySelector('[data-testid="themed-hc-content"]')
    expect(mounted).not.toBeNull()
    expect(content.value?.element).toBe(mounted)
    expect(mounted?.classList.contains('ghost-hover-card-content')).toBe(true)
    expect(mounted?.getAttribute('data-themed')).toBe('')
  })

  it('forwards controlled open, delays, and closeOnEscape on the themed root', async () => {
    vi.useFakeTimers()
    const open = ref(false)
    const updates: boolean[] = []

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostHoverCard,
              {
                open: open.value,
                defaultOpen: false,
                openDelay: 0,
                closeDelay: 50,
                closeOnEscape: false,
                'onUpdate:open': (next: boolean) => {
                  open.value = next
                  updates.push(next)
                },
              },
              {
                default: () => [
                  h(
                    GhostHoverCardTrigger,
                    { id: 'themed-root-trigger' },
                    () => 'T',
                  ),
                  h(GhostHoverCardContent, null, () => 'Body'),
                ],
              },
            )
        },
      }),
    )

    const trigger = document.querySelector<HTMLElement>('#themed-root-trigger')
    trigger?.dispatchEvent(new PointerEvent('pointerenter', { bubbles: true }))
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(updates).toContain(true)
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()
  })
})
