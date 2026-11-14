import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import GhostTooltip from './GhostTooltip.vue'
import GhostTooltipContent from './GhostTooltipContent.vue'
import GhostTooltipProvider from './GhostTooltipProvider.vue'
import GhostTooltipTrigger from './GhostTooltipTrigger.vue'

const attached: ReturnType<typeof mount>[] = []

function mountAttached(component: Parameters<typeof mount>[0]) {
  const wrapper = mount(component, { attachTo: document.body })
  attached.push(wrapper)
  return wrapper
}

function twoTooltipsUnderProvider(options?: {
  provider?: Record<string, number>
  first?: Record<string, number | undefined>
  second?: Record<string, number>
}) {
  return defineComponent({
    setup() {
      return () =>
        h(GhostTooltipProvider, options?.provider ?? {}, {
          default: () => [
            h(GhostTooltip, options?.first ?? {}, {
              default: () => [
                h(GhostTooltipTrigger, { id: 'tip-a-trigger' }, () => 'A'),
                h(
                  GhostTooltipContent,
                  { id: 'tip-a-content' },
                  () => 'Tooltip A',
                ),
              ],
            }),
            h(GhostTooltip, options?.second ?? {}, {
              default: () => [
                h(GhostTooltipTrigger, { id: 'tip-b-trigger' }, () => 'B'),
                h(
                  GhostTooltipContent,
                  { id: 'tip-b-content' },
                  () => 'Tooltip B',
                ),
              ],
            }),
          ],
        })
    },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  vi.useRealTimers()
})

describe('GhostTooltipProvider', () => {
  it('applies the full open delay on the first pointer show', async () => {
    const wrapper = mountAttached(
      twoTooltipsUnderProvider({
        provider: { delayDuration: 400, skipDelayDuration: 300 },
        first: { closeDelay: 0 },
        second: { closeDelay: 0 },
      }),
    )

    const triggerA = wrapper.get('#tip-a-trigger')
    await triggerA.trigger('pointerenter')

    vi.advanceTimersByTime(399)
    expect(document.querySelector('#tip-a-content')).toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-a-content')).not.toBeNull()
  })

  it('skips open delay within skipDelayDuration after the previous closes', async () => {
    const wrapper = mountAttached(
      twoTooltipsUnderProvider({
        provider: { delayDuration: 500, skipDelayDuration: 300 },
        first: { closeDelay: 0 },
        second: { closeDelay: 0 },
      }),
    )

    const triggerA = wrapper.get('#tip-a-trigger')
    const triggerB = wrapper.get('#tip-b-trigger')

    await triggerA.trigger('pointerenter')
    vi.advanceTimersByTime(500)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-a-content')).not.toBeNull()

    await triggerA.trigger('pointerleave')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-a-content')).toBeNull()

    vi.advanceTimersByTime(100)
    await triggerB.trigger('pointerenter')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-b-content')).not.toBeNull()
  })

  it('restores full delay after skipDelayDuration elapses', async () => {
    const wrapper = mountAttached(
      twoTooltipsUnderProvider({
        provider: { delayDuration: 400, skipDelayDuration: 200 },
        first: { closeDelay: 0 },
        second: { closeDelay: 0 },
      }),
    )

    const triggerA = wrapper.get('#tip-a-trigger')
    const triggerB = wrapper.get('#tip-b-trigger')

    await triggerA.trigger('pointerenter')
    vi.advanceTimersByTime(400)
    await flushPromises()
    await nextTick()

    await triggerA.trigger('pointerleave')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    vi.advanceTimersByTime(250)
    await triggerB.trigger('pointerenter')
    vi.advanceTimersByTime(399)
    expect(document.querySelector('#tip-b-content')).toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-b-content')).not.toBeNull()
  })

  it('inherits provider delayDuration when a root omits delayDuration', async () => {
    const wrapper = mountAttached(
      twoTooltipsUnderProvider({
        provider: { delayDuration: 350, skipDelayDuration: 300 },
        first: { closeDelay: 0 },
        second: { closeDelay: 0 },
      }),
    )

    const triggerA = wrapper.get('#tip-a-trigger')
    await triggerA.trigger('pointerenter')
    vi.advanceTimersByTime(349)
    expect(document.querySelector('#tip-a-content')).toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-a-content')).not.toBeNull()
  })

  it('lets a root delayDuration override the provider default', async () => {
    const wrapper = mountAttached(
      twoTooltipsUnderProvider({
        provider: { delayDuration: 600, skipDelayDuration: 300 },
        first: { delayDuration: 120, closeDelay: 0 },
        second: { closeDelay: 0 },
      }),
    )

    const triggerA = wrapper.get('#tip-a-trigger')
    await triggerA.trigger('pointerenter')
    vi.advanceTimersByTime(119)
    expect(document.querySelector('#tip-a-content')).toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-a-content')).not.toBeNull()
  })

  it('does not skip delay for keyboard focus', async () => {
    const wrapper = mountAttached(
      twoTooltipsUnderProvider({
        provider: { delayDuration: 300, skipDelayDuration: 500 },
        first: { closeDelay: 0 },
        second: { closeDelay: 0 },
      }),
    )

    const triggerA = wrapper.get('#tip-a-trigger')
    const triggerB = wrapper.get('#tip-b-trigger')

    await triggerA.trigger('pointerenter')
    vi.advanceTimersByTime(300)
    await flushPromises()
    await nextTick()

    await triggerA.trigger('pointerleave')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    await triggerB.trigger('focusin')
    vi.advanceTimersByTime(299)
    expect(document.querySelector('#tip-b-content')).toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#tip-b-content')).not.toBeNull()
  })
})
