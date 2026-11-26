import { defineComponent, h, nextTick, ref, useTemplateRef } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostScrollSpy from './GhostScrollSpy.vue'
import GhostScrollSpyItem from './GhostScrollSpyItem.vue'
import GhostScrollSpyLink from './GhostScrollSpyLink.vue'
import GhostScrollSpyList from './GhostScrollSpyList.vue'
import type { GhostScrollSpyExposed } from './ghost-scroll-spy'
import { useGhostScrollSpy } from './use-ghost-scroll-spy'

const attached: ReturnType<typeof mount>[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

async function flushScrollSpyMeasure(): Promise<void> {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve()
      })
    })
  })
  await nextTick()
}

function rectForTop(top: number) {
  return {
    top,
    left: 0,
    right: 100,
    bottom: top + 40,
    width: 100,
    height: 40,
    x: 0,
    y: top,
    toJSON: () => ({}),
  }
}

interface ContainerHarness {
  wrapper: ReturnType<typeof mount>
  container: HTMLDivElement
  setScrollTop: (value: number) => Promise<void>
  scrollSpy: ReturnType<typeof ref<GhostScrollSpyExposed | null>>
}

function mockScrollport(
  container: HTMLDivElement,
): ContainerHarness['setScrollTop'] {
  const sectionOffsets: Record<string, number> = {
    alpha: 0,
    beta: 400,
    gamma: 800,
  }
  let scrollTop = 0

  Object.defineProperty(container, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      scrollTop = value
    },
  })
  Object.defineProperty(container, 'scrollHeight', {
    configurable: true,
    get: () => 1200,
  })
  Object.defineProperty(container, 'clientHeight', {
    configurable: true,
    get: () => 200,
  })
  container.scrollTo = vi.fn((options?: ScrollToOptions | number) => {
    if (typeof options === 'number') {
      scrollTop = options
      return
    }
    if (options && typeof options.top === 'number') {
      scrollTop = options.top
    }
  })
  container.getBoundingClientRect = () => rectForTop(0)

  for (const [id, offset] of Object.entries(sectionOffsets)) {
    const section = document.createElement('section')
    section.id = id
    section.tabIndex = -1
    section.getBoundingClientRect = () => rectForTop(offset - scrollTop)
    container.append(section)
  }

  return async (value) => {
    container.scrollTop = value
    container.dispatchEvent(new Event('scroll'))
    await flushScrollSpyMeasure()
  }
}

function mountContainerHarness(
  options: {
    probeOffset?: number
    endThreshold?: number
    extraLinks?: boolean
    showGamma?: ReturnType<typeof ref<boolean>>
    showLinks?: ReturnType<typeof ref<boolean>>
    reversed?: ReturnType<typeof ref<boolean>>
    duplicateBeta?: boolean
    historyMode?: 'replace' | 'push' | 'none'
  } = {},
): ContainerHarness {
  const container = document.createElement('div')
  document.body.append(container)
  const setScrollTop = mockScrollport(container)
  const showGamma = options.showGamma ?? ref(options.extraLinks ?? true)
  const scrollSpy = ref<GhostScrollSpyExposed | null>(null)

  const wrapper = mount(
    defineComponent({
      setup() {
        const spyProps: Record<string, unknown> = {
          container,
          historyMode: options.historyMode ?? 'none',
          ref: scrollSpy,
        }
        if (options.probeOffset !== undefined) {
          spyProps['probeOffset'] = options.probeOffset
        }
        if (options.endThreshold !== undefined) {
          spyProps['endThreshold'] = options.endThreshold
        }
        return () => {
          const links = [
            { target: 'alpha', label: 'Alpha' },
            { target: 'beta', label: 'Beta' },
          ]
          if (showGamma.value) links.push({ target: 'gamma', label: 'Gamma' })
          if (options.duplicateBeta) {
            links.push({ target: 'beta', label: 'Beta duplicate' })
          }
          if (options.reversed?.value) links.reverse()
          return h(GhostScrollSpy, spyProps, () =>
            h(GhostScrollSpyList, null, () =>
              (options.showLinks?.value === false ? [] : links).map(
                ({ target, label }) =>
                  h(GhostScrollSpyItem, { key: label }, () =>
                    h(GhostScrollSpyLink, { target }, () => label),
                  ),
              ),
            ),
          )
        }
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)

  return { wrapper, container, setScrollTop, scrollSpy }
}

function activeLinkText(wrapper: ReturnType<typeof mount>): string {
  return wrapper.get('a[data-state="active"]').text()
}

describe('useGhostScrollSpy', () => {
  it('warns once and uses only the first enabled link for a duplicate target', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { wrapper, setScrollTop } = mountContainerHarness({
      duplicateBeta: true,
    })
    await setScrollTop(320)

    const duplicateWarnings = warn.mock.calls.filter((call) =>
      String(call[0]).includes('GHOST013'),
    )
    expect(duplicateWarnings).toHaveLength(1)
    expect(
      wrapper.findAll('a[aria-current="location"]').map((link) => link.text()),
    ).toEqual(['Beta'])
    expect(
      wrapper
        .get('nav')
        .element.style.getPropertyValue('--ghost-scroll-spy-section-progress'),
    ).toBe('0.5000')
    await setScrollTop(1000)
    expect(activeLinkText(wrapper)).toBe('Gamma')
  })

  it('remeasures when keyed links move without a scroll or resize event', async () => {
    const reversed = ref(false)
    const { wrapper, setScrollTop } = mountContainerHarness({
      reversed,
      extraLinks: false,
    })
    await setScrollTop(450)
    expect(activeLinkText(wrapper)).toBe('Beta')

    reversed.value = true
    await flushScrollSpyMeasure()
    expect(activeLinkText(wrapper)).toBe('Alpha')
  })

  it('resolves the active section from container scroll position', async () => {
    const { wrapper, setScrollTop } = mountContainerHarness()
    await flushScrollSpyMeasure()
    expect(activeLinkText(wrapper)).toBe('Alpha')

    await setScrollTop(350)
    expect(activeLinkText(wrapper)).toBe('Beta')

    await setScrollTop(950)
    expect(activeLinkText(wrapper)).toBe('Gamma')
  })

  it('tracks a sibling template ref after it resolves and when its element is replaced', async () => {
    const key = ref(0)
    const wrapper = mount(
      defineComponent({
        setup() {
          const scrollport = useTemplateRef<HTMLDivElement>('scrollport')
          return () => [
            h(GhostScrollSpy, { container: scrollport.value }, () =>
              h(GhostScrollSpyList, null, () =>
                ['alpha', 'beta'].map((target) =>
                  h(GhostScrollSpyItem, { key: target }, () =>
                    h(GhostScrollSpyLink, { target }, () => target),
                  ),
                ),
              ),
            ),
            h('div', { key: key.value, ref: 'scrollport' }),
          ]
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)

    const first = wrapper.get('div').element
    const scrollFirst = mockScrollport(first)
    await flushScrollSpyMeasure()
    expect(activeLinkText(wrapper)).toBe('alpha')
    await scrollFirst(350)
    expect(activeLinkText(wrapper)).toBe('beta')

    const removeListener = vi.spyOn(first, 'removeEventListener')
    key.value += 1
    await nextTick()
    const scrollSecond = mockScrollport(wrapper.get('div').element)
    await flushScrollSpyMeasure()
    expect(activeLinkText(wrapper)).toBe('alpha')
    expect(wrapper.get('nav').attributes('data-travel')).toBeUndefined()
    expect(removeListener).toHaveBeenCalledWith('scroll', expect.any(Function))

    await scrollSecond(350)
    expect(activeLinkText(wrapper)).toBe('beta')
  })

  it('resets both progress properties when the last link is removed', async () => {
    const showLinks = ref(true)
    const { wrapper, setScrollTop } = mountContainerHarness({ showLinks })
    const { style } = wrapper.get('nav').element
    await setScrollTop(350)
    expect(style.getPropertyValue('--ghost-scroll-spy-progress')).toBe('0.3500')

    showLinks.value = false
    await flushScrollSpyMeasure()
    expect(style.getPropertyValue('--ghost-scroll-spy-progress')).toBe('0.0000')
    expect(style.getPropertyValue('--ghost-scroll-spy-section-progress')).toBe(
      '0.0000',
    )

    await setScrollTop(500)
    expect(style.getPropertyValue('--ghost-scroll-spy-progress')).toBe('0.0000')
    expect(style.getPropertyValue('--ghost-scroll-spy-section-progress')).toBe(
      '0.0000',
    )
    expect(wrapper.find('[aria-current]').exists()).toBe(false)
  })

  it('writes progress custom properties on the root while scrolling', async () => {
    const { wrapper, setScrollTop } = mountContainerHarness()
    await flushScrollSpyMeasure()
    const nav = wrapper.get('nav')
    expect(nav.attributes('style')).toContain('--ghost-scroll-spy-progress')
    expect(nav.attributes('style')).toContain(
      '--ghost-scroll-spy-section-progress',
    )

    await setScrollTop(500)
    const style = nav.attributes('style') ?? ''
    expect(style).toMatch(/--ghost-scroll-spy-progress:\s*[\d.]+/)
    expect(style).toMatch(/--ghost-scroll-spy-section-progress:\s*[\d.]+/)
  })

  it('honors probeOffset and endThreshold from options', async () => {
    const { wrapper, setScrollTop } = mountContainerHarness({
      probeOffset: 120,
      endThreshold: 0.5,
    })
    await flushScrollSpyMeasure()
    expect(activeLinkText(wrapper)).toBe('Alpha')

    await setScrollTop(300)
    expect(activeLinkText(wrapper)).toBe('Beta')

    await setScrollTop(520)
    expect(activeLinkText(wrapper)).toBe('Gamma')
    expect(
      wrapper
        .get('nav')
        .element.style.getPropertyValue('--ghost-scroll-spy-section-progress'),
    ).toBe('1.0000')
  })

  it('aligns nested-container navigation to its padded scrollport and target margin', async () => {
    const { wrapper, container } = mountContainerHarness()
    Object.defineProperty(container, 'clientTop', { value: 5 })
    container.style.scrollPaddingTop = '10%'
    container
      .querySelector<HTMLElement>('#beta')
      ?.style.setProperty('scroll-margin-top', '15px')
    const scrollTo = vi.spyOn(container, 'scrollTo')
    const outerScroll = vi.spyOn(window, 'scrollTo')
    await wrapper.get('a[href="#beta"]').trigger('click')
    expect(scrollTo).toHaveBeenCalledWith({
      top: 360,
      behavior: 'smooth',
    })
    expect(outerScroll).not.toHaveBeenCalled()
  })

  it('forces instant scrolling for both navigation methods under reduced motion', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    const { wrapper, container, scrollSpy } = mountContainerHarness()
    container.style.scrollBehavior = 'smooth'
    const scrollTo = vi.spyOn(container, 'scrollTo')

    await wrapper.get('a[href="#beta"]').trigger('click')
    scrollSpy.value?.scrollTo('gamma', { behavior: 'smooth' })

    expect(scrollTo).toHaveBeenNthCalledWith(1, {
      top: 400,
      behavior: 'instant',
    })
    expect(scrollTo).toHaveBeenNthCalledWith(2, {
      top: 800,
      behavior: 'instant',
    })
  })

  it('remeasures on viewport resize and removes the listener on unmount', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener')
    const { wrapper, container, setScrollTop } = mountContainerHarness()
    await setScrollTop(260)
    expect(activeLinkText(wrapper)).toBe('Alpha')

    Object.defineProperty(container, 'clientHeight', { value: 400 })
    window.dispatchEvent(new Event('resize'))
    await flushScrollSpyMeasure()
    expect(activeLinkText(wrapper)).toBe('Beta')

    wrapper.unmount()
    attached.pop()
    expect(removeListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('remeasures when content inside a fixed scrollport resizes and releases removed targets', async () => {
    const observer = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }
    const Observer = vi.fn<
      (callback: ResizeObserverCallback) => ResizeObserver
    >(function () {
      return observer
    })
    vi.stubGlobal('ResizeObserver', Observer)
    const showGamma = ref(true)
    const { wrapper, container, setScrollTop } = mountContainerHarness({
      showGamma,
    })
    await setScrollTop(350)
    const alpha = container.querySelector('#alpha')
    const gamma = container.querySelector('#gamma')
    expect(observer.observe).toHaveBeenCalledWith(alpha)
    expect(observer.observe).toHaveBeenCalledWith(gamma)
    expect(activeLinkText(wrapper)).toBe('Beta')

    // An earlier section expands, moving Beta below the probe and increasing scrollHeight.
    Object.defineProperty(container, 'scrollHeight', { value: 1400 })
    const beta = container.querySelector('#beta')
    if (!beta) throw new Error('Missing Beta section')
    vi.spyOn(beta, 'getBoundingClientRect').mockReturnValue(rectForTop(250))
    Observer.mock.calls[0]?.[0]([], observer)
    await flushScrollSpyMeasure()
    expect(activeLinkText(wrapper)).toBe('Alpha')
    expect(
      wrapper
        .get('nav')
        .element.style.getPropertyValue('--ghost-scroll-spy-progress'),
    ).toBe('0.2917')

    gamma?.remove()
    showGamma.value = false
    await flushScrollSpyMeasure()
    expect(observer.unobserve).toHaveBeenCalledWith(gamma)
    wrapper.unmount()
    attached.pop()
    expect(observer.disconnect).toHaveBeenCalledOnce()
  })

  it('reselects when the active registration is removed at runtime', async () => {
    const showGamma = ref(true)
    const { wrapper, setScrollTop } = mountContainerHarness({ showGamma })
    await flushScrollSpyMeasure()
    await setScrollTop(950)
    expect(activeLinkText(wrapper)).toBe('Gamma')

    showGamma.value = false
    await nextTick()
    await setScrollTop(0)
    expect(activeLinkText(wrapper)).toBe('Alpha')
  })

  it('sets data-travel on the root after scroll movement', async () => {
    const { wrapper, setScrollTop } = mountContainerHarness()
    await flushScrollSpyMeasure()
    await setScrollTop(100)
    const nav = wrapper.get('nav')
    expect(['down', 'up']).toContain(nav.attributes('data-travel'))

    await new Promise<void>((resolve) => {
      setTimeout(resolve, 220)
    })
    expect(nav.attributes('data-travel')).toBeUndefined()
  })

  it('does not construct IntersectionObserver', async () => {
    const observerSpy = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    }))
    vi.stubGlobal('IntersectionObserver', observerSpy)
    mountContainerHarness({ extraLinks: false })
    await flushScrollSpyMeasure()
    expect(observerSpy).not.toHaveBeenCalled()
  })

  it('removes scroll listeners on unmount', async () => {
    const container = document.createElement('div')
    document.body.append(container)
    const section = document.createElement('section')
    section.id = 'only'
    container.append(section)
    const removeSpy = vi.spyOn(container, 'removeEventListener')
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostScrollSpy, { container, historyMode: 'none' }, () =>
              h(GhostScrollSpyList, null, () =>
                h(GhostScrollSpyItem, null, () =>
                  h(GhostScrollSpyLink, { target: 'only' }, () => 'Only'),
                ),
              ),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await flushScrollSpyMeasure()
    wrapper.unmount()
    attached.pop()
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function))
  })

  it('updates the URL hash on plain link activation', async () => {
    const replaceState = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation(() => undefined)
    const { wrapper } = mountContainerHarness({
      extraLinks: false,
      historyMode: 'replace',
    })
    await flushScrollSpyMeasure()
    await wrapper.get('a[href="#beta"]').trigger('click')
    expect(replaceState).toHaveBeenCalled()
    const hashCall = replaceState.mock.calls.at(-1)
    expect(String(hashCall?.[2])).toContain('#beta')
  })

  it('skips disabled links when resolving the active section', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostScrollSpy, { historyMode: 'none' }, () =>
              h(GhostScrollSpyList, null, () => [
                h(GhostScrollSpyItem, null, () =>
                  h(GhostScrollSpyLink, { target: 'alpha' }, () => 'Alpha'),
                ),
                h(GhostScrollSpyItem, null, () =>
                  h(
                    GhostScrollSpyLink,
                    { target: 'beta', disabled: true },
                    () => 'Beta',
                  ),
                ),
              ]),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()
    expect(activeLinkText(wrapper)).toBe('Alpha')
    const beta = wrapper.findAll('a.ghost-scroll-spy-link').at(1)
    expect(beta?.attributes('data-state')).toBe('disabled')
  })

  it('exposes link styling hooks without changing GhostLink', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostScrollSpy, null, () =>
              h(GhostScrollSpyList, null, () =>
                h(GhostScrollSpyItem, null, () =>
                  h(GhostScrollSpyLink, { target: 'solo' }, () => 'Solo'),
                ),
              ),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()
    const link = wrapper.get('a.ghost-scroll-spy-link')
    expect(link.attributes('data-part')).toBe('link')
    expect(link.classes()).toContain('ghost-link')
  })

  it('leaves modelValue undefined before client mount when defaultValue is omitted', () => {
    let active: string | undefined
    const Harness = defineComponent({
      setup() {
        const spy = useGhostScrollSpy()
        active = spy.activeId.value
        spy.attachRoot(document.createElement('nav'))
        return () => h('div')
      },
    })
    const wrapper = mount(Harness)
    attached.push(wrapper)
    expect(active).toBeUndefined()
  })
})
