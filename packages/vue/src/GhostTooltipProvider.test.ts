import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
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

  it('restores full delay after unmounting an open tooltip once skipDelayDuration passes', async () => {
    const showFirst = ref(true)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltipProvider,
              { delayDuration: 400, skipDelayDuration: 300 },
              {
                default: () => [
                  showFirst.value
                    ? h(
                        GhostTooltip,
                        { closeDelay: 0, delayDuration: 0 },
                        {
                          default: () => [
                            h(
                              GhostTooltipTrigger,
                              { id: 'unmount-a' },
                              () => 'A',
                            ),
                            h(
                              GhostTooltipContent,
                              { id: 'unmount-a-content' },
                              () => 'A tip',
                            ),
                          ],
                        },
                      )
                    : null,
                  h(
                    GhostTooltip,
                    { closeDelay: 0 },
                    {
                      default: () => [
                        h(GhostTooltipTrigger, { id: 'unmount-b' }, () => 'B'),
                        h(
                          GhostTooltipContent,
                          { id: 'unmount-b-content' },
                          () => 'B tip',
                        ),
                      ],
                    },
                  ),
                ],
              },
            )
        },
      }),
    )

    const triggerA = wrapper.get('#unmount-a')
    await triggerA.trigger('pointerenter')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#unmount-a-content')).not.toBeNull()

    showFirst.value = false
    await nextTick()
    expect(document.querySelector('#unmount-a-content')).toBeNull()

    vi.advanceTimersByTime(301)
    const triggerB = wrapper.get('#unmount-b')
    await triggerB.trigger('pointerenter')
    vi.advanceTimersByTime(399)
    expect(document.querySelector('#unmount-b-content')).toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#unmount-b-content')).not.toBeNull()
  })

  it('tracks provider count from controlled open toggles', async () => {
    const open = ref(false)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltipProvider,
              { delayDuration: 500, skipDelayDuration: 300 },
              {
                default: () => [
                  h(
                    GhostTooltip,
                    {
                      open: open.value,
                      'onUpdate:open': (value: boolean) => {
                        open.value = value
                      },
                      closeDelay: 0,
                    },
                    {
                      default: () => [
                        h(GhostTooltipTrigger, { id: 'ctrl-a' }, () => 'A'),
                        h(
                          GhostTooltipContent,
                          { id: 'ctrl-a-content' },
                          () => 'Controlled',
                        ),
                      ],
                    },
                  ),
                  h(
                    GhostTooltip,
                    { closeDelay: 0 },
                    {
                      default: () => [
                        h(GhostTooltipTrigger, { id: 'ctrl-b' }, () => 'B'),
                        h(
                          GhostTooltipContent,
                          { id: 'ctrl-b-content' },
                          () => 'Next',
                        ),
                      ],
                    },
                  ),
                ],
              },
            )
        },
      }),
    )

    open.value = true
    await nextTick()
    await flushPromises()
    expect(document.querySelector('#ctrl-a-content')).not.toBeNull()

    open.value = false
    await nextTick()
    await flushPromises()
    expect(document.querySelector('#ctrl-a-content')).toBeNull()

    vi.advanceTimersByTime(301)
    const triggerB = wrapper.get('#ctrl-b')
    await triggerB.trigger('pointerenter')
    vi.advanceTimersByTime(499)
    expect(document.querySelector('#ctrl-b-content')).toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#ctrl-b-content')).not.toBeNull()
  })

  it('does not inflate open count from defaultOpen without a close transition', async () => {
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltipProvider,
              { delayDuration: 400, skipDelayDuration: 300 },
              {
                default: () => [
                  h(
                    GhostTooltip,
                    { defaultOpen: true, closeDelay: 0 },
                    {
                      default: () => [
                        h(GhostTooltipTrigger, { id: 'def-a' }, () => 'A'),
                        h(
                          GhostTooltipContent,
                          { id: 'def-a-content' },
                          () => 'Default open',
                        ),
                      ],
                    },
                  ),
                  h(
                    GhostTooltip,
                    { closeDelay: 0 },
                    {
                      default: () => [
                        h(GhostTooltipTrigger, { id: 'def-b' }, () => 'B'),
                        h(
                          GhostTooltipContent,
                          { id: 'def-b-content' },
                          () => 'Second',
                        ),
                      ],
                    },
                  ),
                ],
              },
            )
        },
      }),
    )

    expect(document.querySelector('#def-a-content')).not.toBeNull()
    const triggerA = wrapper.get('#def-a')
    await triggerA.trigger('pointerleave')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#def-a-content')).toBeNull()

    vi.advanceTimersByTime(301)
    const triggerB = wrapper.get('#def-b')
    await triggerB.trigger('pointerenter')
    vi.advanceTimersByTime(399)
    expect(document.querySelector('#def-b-content')).toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#def-b-content')).not.toBeNull()
  })

  it('does not drift count when controlled parent ignores update:open', async () => {
    const open = ref(true)
    const wrapper = mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltipProvider,
              { delayDuration: 400, skipDelayDuration: 300 },
              {
                default: () => [
                  h(
                    GhostTooltip,
                    {
                      open: open.value,
                      'onUpdate:open': () => {
                        /* consumer keeps open pinned true */
                      },
                      closeDelay: 0,
                    },
                    {
                      default: () => [
                        h(GhostTooltipTrigger, { id: 'ignore-a' }, () => 'A'),
                        h(
                          GhostTooltipContent,
                          { id: 'ignore-a-content' },
                          () => 'Pinned',
                        ),
                      ],
                    },
                  ),
                  h(
                    GhostTooltip,
                    { closeDelay: 0 },
                    {
                      default: () => [
                        h(GhostTooltipTrigger, { id: 'ignore-b' }, () => 'B'),
                        h(
                          GhostTooltipContent,
                          { id: 'ignore-b-content' },
                          () => 'Other',
                        ),
                      ],
                    },
                  ),
                ],
              },
            )
        },
      }),
    )

    expect(document.querySelector('#ignore-a-content')).not.toBeNull()
    const triggerA = wrapper.get('#ignore-a')
    await triggerA.trigger('pointerleave')
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#ignore-a-content')).not.toBeNull()

    open.value = false
    await nextTick()
    await flushPromises()
    expect(document.querySelector('#ignore-a-content')).toBeNull()

    vi.advanceTimersByTime(301)
    const triggerB = wrapper.get('#ignore-b')
    await triggerB.trigger('pointerenter')
    vi.advanceTimersByTime(399)
    expect(document.querySelector('#ignore-b-content')).toBeNull()
    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(document.querySelector('#ignore-b-content')).not.toBeNull()
  })
})
