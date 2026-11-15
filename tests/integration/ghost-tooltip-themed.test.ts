import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
  type GhostTooltipContentExposed,
  type GhostTooltipTriggerExposed,
} from '../../packages/themes/src/index'
import { GhostTooltipProvider } from '../../packages/vue/src/index'

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

describe('themed GhostTooltip wrappers', () => {
  it('forwards delay props and exposes trigger/content elements', async () => {
    vi.useFakeTimers()
    const trigger = ref<GhostTooltipTriggerExposed | null>(null)
    const content = ref<GhostTooltipContentExposed | null>(null)

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
                    {
                      ref: trigger,
                      'data-testid': 'themed-tt-trigger',
                    },
                    () => 'Hint anchor',
                  ),
                  h(
                    GhostTooltipContent,
                    {
                      ref: content,
                      'data-testid': 'themed-tt-content',
                    },
                    () => 'Density hint',
                  ),
                ],
              },
            )
        },
      }),
    )

    expect(trigger.value?.element).toBe(
      document.querySelector('[data-testid="themed-tt-trigger"]'),
    )

    trigger.value?.element?.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true }),
    )
    vi.runOnlyPendingTimers()
    await flushPromises()
    await nextTick()

    const mounted = document.querySelector('[data-testid="themed-tt-content"]')
    expect(mounted).not.toBeNull()
    expect(content.value?.element).toBe(mounted)
    expect(mounted?.classList.contains('ghost-tooltip-content')).toBe(true)
  })

  it('inherits provider delayDuration when themed GhostTooltip omits delayDuration', async () => {
    vi.useFakeTimers()
    const trigger = ref<GhostTooltipTriggerExposed | null>(null)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltipProvider,
              { delayDuration: 20 },
              {
                default: () =>
                  h(GhostTooltip, null, {
                    default: () => [
                      h(
                        GhostTooltipTrigger,
                        {
                          ref: trigger,
                          'data-testid': 'themed-provider-trigger',
                        },
                        () => 'Hint anchor',
                      ),
                      h(
                        GhostTooltipContent,
                        {
                          'data-testid': 'themed-provider-content',
                        },
                        () => 'Inherited delay',
                      ),
                    ],
                  }),
              },
            )
        },
      }),
    )

    trigger.value?.element?.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true }),
    )

    vi.advanceTimersByTime(19)
    await flushPromises()
    await nextTick()
    expect(
      document.querySelector('[data-testid="themed-provider-content"]'),
    ).toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(
      document.querySelector('[data-testid="themed-provider-content"]'),
    ).not.toBeNull()
  })

  it('preserves explicit delayDuration override on themed GhostTooltip under a provider', async () => {
    vi.useFakeTimers()
    const trigger = ref<GhostTooltipTriggerExposed | null>(null)

    mountAttached(
      defineComponent({
        setup() {
          return () =>
            h(
              GhostTooltipProvider,
              { delayDuration: 20 },
              {
                default: () =>
                  h(
                    GhostTooltip,
                    { delayDuration: 150 },
                    {
                      default: () => [
                        h(
                          GhostTooltipTrigger,
                          {
                            ref: trigger,
                            'data-testid': 'themed-override-trigger',
                          },
                          () => 'Hint anchor',
                        ),
                        h(
                          GhostTooltipContent,
                          {
                            'data-testid': 'themed-override-content',
                          },
                          () => 'Overridden delay',
                        ),
                      ],
                    },
                  ),
              },
            )
        },
      }),
    )

    trigger.value?.element?.dispatchEvent(
      new PointerEvent('pointerenter', { bubbles: true }),
    )

    vi.advanceTimersByTime(20)
    await flushPromises()
    await nextTick()
    expect(
      document.querySelector('[data-testid="themed-override-content"]'),
    ).toBeNull()

    vi.advanceTimersByTime(129)
    await flushPromises()
    await nextTick()
    expect(
      document.querySelector('[data-testid="themed-override-content"]'),
    ).toBeNull()

    vi.advanceTimersByTime(1)
    await flushPromises()
    await nextTick()
    expect(
      document.querySelector('[data-testid="themed-override-content"]'),
    ).not.toBeNull()
  })
})
