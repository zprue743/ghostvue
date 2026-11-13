import type * as FloatingDom from '@floating-ui/dom'
import { flushPromises, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useFloating } from './use-floating'

const floatingDomMocks = vi.hoisted(() => ({
  cleanup: vi.fn(),
  autoUpdate: vi.fn(),
  computePosition: vi.fn(),
}))

let computePositionOverride:
  | ((
      ...args: Parameters<typeof FloatingDom.computePosition>
    ) => ReturnType<typeof FloatingDom.computePosition>)
  | null = null

vi.mock('@floating-ui/dom', async () => {
  const actual = await vi.importActual<typeof FloatingDom>('@floating-ui/dom')
  return {
    ...actual,
    autoUpdate: (
      reference: Parameters<typeof actual.autoUpdate>[0],
      floating: Parameters<typeof actual.autoUpdate>[1],
      update: Parameters<typeof actual.autoUpdate>[2],
      options?: Parameters<typeof actual.autoUpdate>[3],
    ) => {
      floatingDomMocks.autoUpdate(reference, floating, update, options)
      const realCleanup = actual.autoUpdate(
        reference,
        floating,
        update,
        options,
      )
      return () => {
        floatingDomMocks.cleanup()
        realCleanup()
      }
    },
    computePosition: (
      reference: Parameters<typeof actual.computePosition>[0],
      floating: Parameters<typeof actual.computePosition>[1],
      config?: Parameters<typeof actual.computePosition>[2],
    ) => {
      floatingDomMocks.computePosition(reference, floating, config)
      if (computePositionOverride) {
        return computePositionOverride(reference, floating, config)
      }
      return actual.computePosition(reference, floating, config)
    },
  }
})

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  floatingDomMocks.cleanup.mockClear()
  floatingDomMocks.autoUpdate.mockClear()
  floatingDomMocks.computePosition.mockClear()
  computePositionOverride = null
})

describe('useFloating', () => {
  it('does not position or touch browser globals during SSR setup', async () => {
    const addWindow = vi.spyOn(window, 'addEventListener')
    const addDoc = vi.spyOn(document, 'addEventListener')

    let snapshot:
      | {
          x: number
          y: number
          placement: string
          strategy: string
          isPositioned: boolean
        }
      | undefined

    const Comp = defineComponent({
      setup() {
        const anchor = ref<HTMLElement | null>(null)
        const floating = ref<HTMLElement | null>(null)
        const { x, y, placement, strategy, isPositioned } = useFloating(
          anchor,
          floating,
          {
            placement: 'top-start',
            strategy: 'fixed',
          },
        )
        snapshot = {
          x: x.value,
          y: y.value,
          placement: placement.value,
          strategy: strategy.value,
          isPositioned: isPositioned.value,
        }
        return () =>
          h('div', [
            h('button', { ref: anchor }, 'Anchor'),
            h('div', { ref: floating }, 'Floating'),
          ])
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('Floating')
    expect(html).not.toContain('data-placement')
    expect(snapshot).toEqual({
      x: 0,
      y: 0,
      placement: 'top-start',
      strategy: 'fixed',
      isPositioned: false,
    })
    expect(floatingDomMocks.autoUpdate).not.toHaveBeenCalled()
    expect(floatingDomMocks.computePosition).not.toHaveBeenCalled()
    expect(addWindow).not.toHaveBeenCalled()
    expect(addDoc).not.toHaveBeenCalled()

    addWindow.mockRestore()
    addDoc.mockRestore()
  })

  it('computes position after mount, sets data-placement, and accepts MaybeRefOrGetter options', async () => {
    const anchor = ref<HTMLElement | null>(null)
    const floating = ref<HTMLElement | null>(null)
    const desiredPlacement = ref<'top' | 'bottom'>('top')
    const offsetValue = ref(8)
    const flipEnabled = ref(true)
    const shiftEnabled = ref(true)
    const strategyValue = ref<'absolute' | 'fixed'>('fixed')

    let floatingState: ReturnType<typeof useFloating> | undefined

    const wrapper = mount(
      defineComponent({
        setup() {
          floatingState = useFloating(
            () => anchor.value,
            () => floating.value,
            {
              placement: desiredPlacement,
              offset: () => offsetValue.value,
              flip: flipEnabled,
              shift: shiftEnabled,
              strategy: strategyValue,
            },
          )
          return () =>
            h('div', [
              h('button', { ref: anchor, type: 'button' }, 'Anchor'),
              h('div', { ref: floating, 'data-testid': 'floating' }, 'Tip'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    await flushPromises()

    expect(floatingDomMocks.autoUpdate).toHaveBeenCalledTimes(1)
    expect(floatingDomMocks.computePosition).toHaveBeenCalled()
    expect(floatingState?.placement.value).toBe('top')
    expect(floatingState?.strategy.value).toBe('fixed')
    expect(typeof floatingState?.x.value).toBe('number')
    expect(typeof floatingState?.y.value).toBe('number')
    expect(
      wrapper.get('[data-testid="floating"]').attributes('data-placement'),
    ).toBe('top')

    // Reactive option updates trigger clean re-setup and recomputation.
    desiredPlacement.value = 'bottom'
    offsetValue.value = 12
    flipEnabled.value = false
    shiftEnabled.value = false
    await nextTick()
    await flushPromises()

    expect(floatingDomMocks.cleanup).toHaveBeenCalledTimes(1)
    expect(floatingState?.placement.value).toBe('bottom')
    expect(
      wrapper.get('[data-testid="floating"]').attributes('data-placement'),
    ).toBe('bottom')

    await floatingState?.update()
  })

  it('cleans up autoUpdate and removes data-placement when floating closes or unmounts', async () => {
    const anchor = ref<HTMLElement | null>(null)
    const floating = ref<HTMLElement | null>(null)
    const open = ref(true)

    const wrapper = mount(
      defineComponent({
        setup() {
          useFloating(anchor, () => (open.value ? floating.value : null))
          return () =>
            h('div', [
              h('button', { ref: anchor, type: 'button' }, 'Anchor'),
              h('div', { ref: floating, 'data-testid': 'floating' }, 'Tip'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    await flushPromises()
    const floatingEl = wrapper.get('[data-testid="floating"]').element
    expect(floatingEl.getAttribute('data-placement')).toBe('bottom')

    open.value = false
    await nextTick()
    expect(floatingDomMocks.cleanup).toHaveBeenCalledTimes(1)
    expect(floatingEl.hasAttribute('data-placement')).toBe(false)

    open.value = true
    await nextTick()
    await flushPromises()
    expect(floatingEl.getAttribute('data-placement')).toBe('bottom')

    wrapper.unmount()
    expect(floatingDomMocks.cleanup).toHaveBeenCalledTimes(2)
  })

  it('ignores stale computePosition results when calls resolve out of order', async () => {
    type ComputeResult = Awaited<ReturnType<typeof FloatingDom.computePosition>>
    const resolvers: ((result: ComputeResult) => void)[] = []

    computePositionOverride = () =>
      new Promise<ComputeResult>((resolve) => {
        resolvers.push(resolve)
      })

    const anchor = ref<HTMLElement | null>(null)
    const floating = ref<HTMLElement | null>(null)
    let floatingState: ReturnType<typeof useFloating> | undefined

    const wrapper = mount(
      defineComponent({
        setup() {
          floatingState = useFloating(anchor, floating, { placement: 'top' })
          return () =>
            h('div', [
              h('button', { ref: anchor, type: 'button' }, 'Anchor'),
              h('div', { ref: floating, 'data-testid': 'floating' }, 'Tip'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    // autoUpdate runs immediately on mount for call #1.
    expect(resolvers).toHaveLength(1)

    // Trigger call #2 before call #1 resolves.
    const secondPromise = floatingState?.update()
    expect(resolvers).toHaveLength(2)

    // Resolve call #2 first, then resolve stale call #1 with older coordinates.
    resolvers[1]?.({
      x: 120,
      y: 240,
      placement: 'bottom-end',
      strategy: 'absolute',
      middlewareData: {},
    })
    await secondPromise

    resolvers[0]?.({
      x: 10,
      y: 20,
      placement: 'top-start',
      strategy: 'absolute',
      middlewareData: {},
    })
    await flushPromises()

    expect(floatingState?.x.value).toBe(120)
    expect(floatingState?.y.value).toBe(240)
    expect(floatingState?.placement.value).toBe('bottom-end')
    expect(
      wrapper.get('[data-testid="floating"]').attributes('data-placement'),
    ).toBe('bottom-end')
  })

  it('tracks isPositioned from first resolution and resets on close or target change', async () => {
    type ComputeResult = Awaited<ReturnType<typeof FloatingDom.computePosition>>
    const resolvers: ((result: ComputeResult) => void)[] = []

    computePositionOverride = () =>
      new Promise<ComputeResult>((resolve) => {
        resolvers.push(resolve)
      })

    const anchorA = ref<HTMLElement | null>(null)
    const anchorB = ref<HTMLElement | null>(null)
    const useSecondAnchor = ref(false)
    const open = ref(true)
    const placement = ref<'bottom' | 'top'>('bottom')
    const floating = ref<HTMLElement | null>(null)
    let floatingState: ReturnType<typeof useFloating> | undefined

    const wrapper = mount(
      defineComponent({
        setup() {
          floatingState = useFloating(
            () => (useSecondAnchor.value ? anchorB.value : anchorA.value),
            () => (open.value ? floating.value : null),
            { placement },
          )
          return () =>
            h('div', [
              h('button', { ref: anchorA, type: 'button' }, 'Anchor A'),
              h('button', { ref: anchorB, type: 'button' }, 'Anchor B'),
              h('div', { ref: floating, 'data-testid': 'floating' }, 'Tip'),
            ])
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    // Before first computePosition resolves, isPositioned must stay false.
    expect(floatingState?.isPositioned.value).toBe(false)
    expect(resolvers).toHaveLength(1)

    resolvers[0]?.({
      x: 16,
      y: 32,
      placement: 'bottom',
      strategy: 'absolute',
      middlewareData: {},
    })
    await flushPromises()
    expect(floatingState?.isPositioned.value).toBe(true)

    // Option-only updates must not reset isPositioned while open on the same targets.
    placement.value = 'top'
    await nextTick()
    expect(floatingState?.isPositioned.value).toBe(true)
    expect(resolvers).toHaveLength(2)
    resolvers[1]?.({
      x: 16,
      y: 8,
      placement: 'top',
      strategy: 'absolute',
      middlewareData: {},
    })
    await flushPromises()
    expect(floatingState?.isPositioned.value).toBe(true)

    // Swapping the anchor target resets isPositioned until the new position resolves.
    useSecondAnchor.value = true
    await nextTick()
    expect(floatingState?.isPositioned.value).toBe(false)
    expect(resolvers).toHaveLength(3)
    resolvers[2]?.({
      x: 48,
      y: 8,
      placement: 'top',
      strategy: 'absolute',
      middlewareData: {},
    })
    await flushPromises()
    expect(floatingState?.isPositioned.value).toBe(true)

    // Closing (floating -> null) resets isPositioned.
    open.value = false
    await nextTick()
    expect(floatingState?.isPositioned.value).toBe(false)
  })
})
