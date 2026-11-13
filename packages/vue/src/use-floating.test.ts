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
})

describe('useFloating', () => {
  it('does not position or touch browser globals during SSR setup', async () => {
    const addWindow = vi.spyOn(window, 'addEventListener')
    const addDoc = vi.spyOn(document, 'addEventListener')

    let snapshot:
      { x: number; y: number; placement: string; strategy: string } | undefined

    const Comp = defineComponent({
      setup() {
        const anchor = ref<HTMLElement | null>(null)
        const floating = ref<HTMLElement | null>(null)
        const { x, y, placement, strategy } = useFloating(anchor, floating, {
          placement: 'top-start',
          strategy: 'fixed',
        })
        snapshot = {
          x: x.value,
          y: y.value,
          placement: placement.value,
          strategy: strategy.value,
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
})
