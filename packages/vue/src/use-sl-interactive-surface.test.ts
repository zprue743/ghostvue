import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSlInteractiveSurface } from './use-sl-interactive-surface'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  vi.unstubAllGlobals()
})

function stubPointerMedia(options: {
  reducedMotion?: boolean
  coarsePointer?: boolean
}) {
  const reduced = {
    matches: options.reducedMotion === true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  const coarse = {
    matches: options.coarsePointer === true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal('matchMedia', (query: string) => {
    if (query.includes('prefers-reduced-motion')) return reduced
    if (query.includes('pointer: coarse')) return coarse
    return {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
  })
  class IdleObserver {
    observe(target: Element): void {
      void target
    }
    disconnect(): void {
      return undefined
    }
  }
  vi.stubGlobal('IntersectionObserver', IdleObserver)
  vi.stubGlobal('ResizeObserver', IdleObserver)
  return { reduced, coarse }
}

function mountSurface(
  setup: () => unknown,
  render: () => ReturnType<typeof h>,
) {
  const wrapper = mount(
    defineComponent({
      setup() {
        setup()
        return render
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

describe('useSlInteractiveSurface', () => {
  it('starts idle and moves to tracking then idle on pointer enter/leave', async () => {
    stubPointerMedia({})
    const host = ref<HTMLElement | null>(null)
    let rootProps!: ReturnType<typeof useSlInteractiveSurface>['rootProps']

    const wrapper = mountSurface(
      () => {
        ;({ rootProps } = useSlInteractiveSurface(host))
      },
      () => h('div', { ref: host, ...rootProps.value }, 'Card'),
    )
    await nextTick()

    expect(rootProps.value['data-state']).toBe('idle')
    expect(rootProps.value['data-interactive']).toBe('spotlight')
    expect(rootProps.value['data-part']).toBe('root')

    const element = wrapper.get('div').element
    element.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON() {
        return {}
      },
    })

    element.dispatchEvent(
      new PointerEvent('pointerenter', { clientX: 40, clientY: 25 }),
    )
    await nextTick()

    expect(rootProps.value['data-state']).toBe('tracking')
    expect(element.style.getPropertyValue('--sl-pointer-x')).toBe('40px')
    expect(element.style.getPropertyValue('--sl-pointer-y')).toBe('25px')

    element.dispatchEvent(new PointerEvent('pointerleave'))
    await nextTick()

    expect(rootProps.value['data-state']).toBe('idle')
    expect(element.style.getPropertyValue('--sl-pointer-nx')).toBe('0')
    expect(element.style.getPropertyValue('--sl-pointer-ny')).toBe('0')
  })

  it('stays off under prefers-reduced-motion', async () => {
    stubPointerMedia({ reducedMotion: true })
    const host = ref<HTMLElement | null>(null)
    let rootProps!: ReturnType<typeof useSlInteractiveSurface>['rootProps']

    const wrapper = mountSurface(
      () => {
        ;({ rootProps } = useSlInteractiveSurface(host))
      },
      () => h('div', { ref: host, ...rootProps.value }, 'Card'),
    )
    await nextTick()

    expect(rootProps.value['data-state']).toBe('off')
    wrapper
      .get('div')
      .element.dispatchEvent(
        new PointerEvent('pointerenter', { clientX: 8, clientY: 8 }),
      )
    await nextTick()
    expect(rootProps.value['data-state']).toBe('off')
  })

  it('stays off under coarse pointers', async () => {
    stubPointerMedia({ coarsePointer: true })
    const host = ref<HTMLElement | null>(null)
    let rootProps!: ReturnType<typeof useSlInteractiveSurface>['rootProps']

    const wrapper = mountSurface(
      () => {
        ;({ rootProps } = useSlInteractiveSurface(host))
      },
      () => h('div', { ref: host, ...rootProps.value }, 'Card'),
    )
    await nextTick()

    expect(rootProps.value['data-state']).toBe('off')
    wrapper
      .get('div')
      .element.dispatchEvent(
        new PointerEvent('pointermove', { clientX: 12, clientY: 12 }),
      )
    await nextTick()
    expect(rootProps.value['data-state']).toBe('off')
  })

  it('omits tracking when effects is an empty list', async () => {
    stubPointerMedia({})
    const host = ref<HTMLElement | null>(null)
    let rootProps!: ReturnType<typeof useSlInteractiveSurface>['rootProps']

    const wrapper = mountSurface(
      () => {
        ;({ rootProps } = useSlInteractiveSurface(host, { effects: [] }))
      },
      () => h('div', { ref: host, ...rootProps.value }, 'Card'),
    )
    await nextTick()

    expect(rootProps.value['data-interactive']).toBe('')
    expect(rootProps.value['data-state']).toBe('off')
    expect(rootProps.value['data-interactive-state']).toBeUndefined()
    wrapper
      .get('div')
      .element.dispatchEvent(
        new PointerEvent('pointerenter', { clientX: 8, clientY: 8 }),
      )
    await nextTick()
    expect(rootProps.value['data-state']).toBe('off')
  })

  it('writes data-interactive-state when asked, leaving data-state free', async () => {
    stubPointerMedia({})
    const host = ref<HTMLElement | null>(null)
    let rootProps!: ReturnType<typeof useSlInteractiveSurface>['rootProps']

    mountSurface(
      () => {
        ;({ rootProps } = useSlInteractiveSurface(host, {
          stateAttribute: 'data-interactive-state',
        }))
      },
      () => h('div', { ref: host, ...rootProps.value }, 'Card'),
    )
    await nextTick()

    expect(rootProps.value['data-interactive-state']).toBe('idle')
    expect(rootProps.value['data-state']).toBeUndefined()
  })

  it('removes listeners on unmount', async () => {
    stubPointerMedia({})
    const host = ref<HTMLElement | null>(null)
    let rootProps!: ReturnType<typeof useSlInteractiveSurface>['rootProps']

    const wrapper = mountSurface(
      () => {
        ;({ rootProps } = useSlInteractiveSurface(host))
      },
      () => h('div', { ref: host, ...rootProps.value }, 'Card'),
    )
    await nextTick()

    const element = wrapper.get('div').element
    const remove = vi.spyOn(element, 'removeEventListener')
    wrapper.unmount()
    attached.length = 0

    expect(remove).toHaveBeenCalledWith('pointerenter', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('pointerleave', expect.any(Function))
    expect(rootProps.value['data-state']).toBe('off')
  })

  it('does not touch window during setup so SSR stays side-effect free', async () => {
    const matchMedia = vi.fn()
    vi.stubGlobal('matchMedia', matchMedia)

    const Comp = defineComponent({
      setup() {
        const host = ref<HTMLElement | null>(null)
        useSlInteractiveSurface(host)
        return () => h('div', { ref: host }, 'Card')
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('Card')
    expect(matchMedia).not.toHaveBeenCalled()
  })
})
