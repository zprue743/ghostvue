import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostScrollSpy from './GhostScrollSpy.vue'
import GhostScrollSpyItem from './GhostScrollSpyItem.vue'
import GhostScrollSpyLink from './GhostScrollSpyLink.vue'
import GhostScrollSpyList from './GhostScrollSpyList.vue'
import { useGhostScrollSpy } from './use-ghost-scroll-spy'

const attached: ReturnType<typeof mount>[] = []

vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  vi.restoreAllMocks()
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
}

function mountContainerHarness(
  options: {
    probeOffset?: number
    endThreshold?: number
    extraLinks?: boolean
    showGamma?: ReturnType<typeof ref<boolean>>
    historyMode?: 'replace' | 'push' | 'none'
  } = {},
): ContainerHarness {
  const container = document.createElement('div')
  document.body.append(container)

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

  const showGamma = options.showGamma ?? ref(options.extraLinks ?? true)

  const wrapper = mount(
    defineComponent({
      setup() {
        const spyProps: Record<string, unknown> = {
          container,
          historyMode: options.historyMode ?? 'none',
        }
        if (options.probeOffset !== undefined) {
          spyProps['probeOffset'] = options.probeOffset
        }
        if (options.endThreshold !== undefined) {
          spyProps['endThreshold'] = options.endThreshold
        }
        return () =>
          h(GhostScrollSpy, spyProps, () =>
            h(GhostScrollSpyList, null, () => [
              h(GhostScrollSpyItem, null, () =>
                h(GhostScrollSpyLink, { target: 'alpha' }, () => 'Alpha'),
              ),
              h(GhostScrollSpyItem, null, () =>
                h(GhostScrollSpyLink, { target: 'beta' }, () => 'Beta'),
              ),
              ...(showGamma.value
                ? [
                    h(GhostScrollSpyItem, null, () =>
                      h(GhostScrollSpyLink, { target: 'gamma' }, () => 'Gamma'),
                    ),
                  ]
                : []),
            ]),
          )
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)

  return {
    wrapper,
    container,
    setScrollTop: async (value: number) => {
      scrollTop = value
      container.dispatchEvent(new Event('scroll', { bubbles: true }))
      await flushScrollSpyMeasure()
    },
  }
}

function activeLinkText(wrapper: ReturnType<typeof mount>): string {
  return wrapper.get('a[data-state="active"]').text()
}

describe('useGhostScrollSpy', () => {
  it('warns once for duplicate targets in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostScrollSpy, null, () =>
              h(GhostScrollSpyList, null, () => [
                h(GhostScrollSpyItem, null, () =>
                  h(GhostScrollSpyLink, { target: 'dupe' }, () => 'A'),
                ),
                h(GhostScrollSpyItem, null, () =>
                  h(GhostScrollSpyLink, { target: 'dupe' }, () => 'B'),
                ),
              ]),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()

    const duplicateWarnings = warn.mock.calls.filter((call) =>
      String(call[0]).includes('GHOST013'),
    )
    expect(duplicateWarnings).toHaveLength(1)
  })

  it('registers items in DOM order after reordering', async () => {
    const ReorderDemo = defineComponent({
      setup() {
        const flip = ref(false)
        return () =>
          h(GhostScrollSpy, null, () =>
            h(GhostScrollSpyList, null, () =>
              flip.value
                ? [
                    h(GhostScrollSpyItem, null, () =>
                      h(GhostScrollSpyLink, { target: 'b' }, () => 'B'),
                    ),
                    h(GhostScrollSpyItem, null, () =>
                      h(GhostScrollSpyLink, { target: 'a' }, () => 'A'),
                    ),
                  ]
                : [
                    h(GhostScrollSpyItem, null, () =>
                      h(GhostScrollSpyLink, { target: 'a' }, () => 'A'),
                    ),
                    h(GhostScrollSpyItem, null, () =>
                      h(GhostScrollSpyLink, { target: 'b' }, () => 'B'),
                    ),
                  ],
            ),
          )
      },
    })

    const wrapper = mount(ReorderDemo, { attachTo: document.body })
    attached.push(wrapper)
    await nextTick()
    const firstOrder = wrapper
      .findAll('a.ghost-scroll-spy-link')
      .map((link) => link.text())
    expect(firstOrder).toEqual(['A', 'B'])
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
