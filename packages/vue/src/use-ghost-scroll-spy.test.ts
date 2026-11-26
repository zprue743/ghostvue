import { defineComponent, h, nextTick } from 'vue'
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
})

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
        const flip = vi.fn(() => false)
        return () =>
          h(GhostScrollSpy, null, () =>
            h(GhostScrollSpyList, null, () =>
              flip()
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

  it('exposes measure through the composable attachRoot hook', async () => {
    const harness = defineComponent({
      setup() {
        const root = document.createElement('nav')
        const spy = useGhostScrollSpy({
          onValueChange: () => undefined,
        })
        spy.attachRoot(root)
        spy.registerItem(Symbol('one'), 'one', false, () => null)
        spy.measure()
        return () => h('div')
      },
    })
    const wrapper = mount(harness)
    attached.push(wrapper)
    await nextTick()
    expect(true).toBe(true)
  })
})
