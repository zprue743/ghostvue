import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostScrollSpy from './GhostScrollSpy.vue'
import GhostScrollSpyItem from './GhostScrollSpyItem.vue'
import GhostScrollSpyLink from './GhostScrollSpyLink.vue'
import GhostScrollSpyList from './GhostScrollSpyList.vue'

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
  window.scrollTo(0, 0)
})

function mountBasicRail(overrides: Record<string, unknown> = {}) {
  for (const id of ['alpha', 'beta']) {
    const section = document.createElement('section')
    section.id = id
    section.tabIndex = -1
    section.style.height = '900px'
    document.body.append(section)
  }

  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(
            GhostScrollSpy,
            {
              label: 'In-page sections',
              ...overrides,
            },
            () =>
              h(GhostScrollSpyList, null, () => [
                h(GhostScrollSpyItem, { target: 'alpha' }, () =>
                  h(GhostScrollSpyLink, { target: 'alpha' }, () => 'Alpha'),
                ),
                h(GhostScrollSpyItem, { target: 'beta' }, () =>
                  h(GhostScrollSpyLink, { target: 'beta' }, () => 'Beta'),
                ),
              ]),
          )
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

describe('GhostScrollSpy', () => {
  it('renders navigation landmark semantics', async () => {
    const wrapper = mountBasicRail()
    await nextTick()
    const nav = wrapper.find('nav')
    expect(nav.attributes('aria-label')).toBe('In-page sections')
    expect(nav.attributes('data-part')).toBe('root')
    expect(nav.attributes('data-orientation')).toBe('vertical')
    expect(wrapper.find('ol[data-part="list"]').exists()).toBe(true)
  })

  it('marks the first item active by default for SSR-style output', async () => {
    const wrapper = mountBasicRail()
    await nextTick()
    const first = wrapper.get('a[data-part="link"][data-state="active"]')
    expect(first.attributes('aria-current')).toBe('location')
    expect(first.attributes('href')).toBe('#alpha')
  })

  it('throws when parts are composed outside the root', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() =>
      mount(GhostScrollSpyList, { attachTo: document.body }),
    ).toThrow('GhostScrollSpyList must be used inside GhostScrollSpy')
  })

  it('preserves modified clicks for native navigation', async () => {
    const wrapper = mountBasicRail()
    await nextTick()
    const link = wrapper.get('a[href="#beta"]')
    const prevent = vi.fn()
    await link.trigger('click', {
      metaKey: true,
      preventDefault: prevent,
    })
    expect(prevent).not.toHaveBeenCalled()
  })

  it('emits activate and allows cancellation before scroll side effects', async () => {
    const section = document.createElement('section')
    section.id = 'alpha'
    document.body.append(section)

    const onActivate = vi.fn((payload: { event: Event }) => {
      payload.event.preventDefault()
    })
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostScrollSpy, { onActivate }, () =>
              h(GhostScrollSpyList, null, () =>
                h(GhostScrollSpyItem, null, () =>
                  h(GhostScrollSpyLink, { target: 'alpha' }, () => 'Alpha'),
                ),
              ),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()
    const link = wrapper.get('a')
    await link.trigger('click')
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('supports controlled modelValue', async () => {
    const wrapper = mount(
      defineComponent({
        setup() {
          return () =>
            h(GhostScrollSpy, { modelValue: 'beta' }, () =>
              h(GhostScrollSpyList, null, () =>
                h(GhostScrollSpyItem, null, () =>
                  h(GhostScrollSpyLink, { target: 'beta' }, () => 'Beta'),
                ),
              ),
            )
        },
      }),
      { attachTo: document.body },
    )
    attached.push(wrapper)
    await nextTick()
    const active = wrapper.get('a[aria-current="location"]')
    expect(active.text()).toBe('Beta')
  })
})
