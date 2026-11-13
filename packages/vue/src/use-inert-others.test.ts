import { mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, ref } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useInertOthers, type InertOthersElements } from './use-inert-others'

const attached: ReturnType<typeof mount>[] = []
const extraNodes: Element[] = []

afterEach(() => {
  for (const wrapper of attached) {
    wrapper.unmount()
  }
  attached.length = 0
  for (const node of extraNodes) {
    node.remove()
  }
  extraNodes.length = 0
  document.body.innerHTML = ''
})

function appendToBody(html: string): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html.trim()
  const el = wrapper.firstElementChild as HTMLElement
  document.body.append(el)
  extraNodes.push(el)
  return el
}

function mountInert(
  elements: InertOthersElements,
  enabled: () => boolean = () => true,
) {
  const wrapper = mount(
    defineComponent({
      setup() {
        useInertOthers(elements, enabled)
        return () => h('div', 'Inert host')
      },
    }),
    { attachTo: document.body },
  )
  attached.push(wrapper)
  return wrapper
}

describe('useInertOthers', () => {
  it('does not touch the DOM during SSR setup', async () => {
    const sibling = appendToBody('<main>Background</main>')
    const setAttributeSpy = vi.spyOn(sibling, 'setAttribute')

    const Comp = defineComponent({
      setup() {
        const kept = ref<HTMLElement | null>(null)
        useInertOthers(kept, true)
        return () => h('div', { ref: kept }, 'Modal')
      },
    })

    const html = await renderToString(createSSRApp(Comp))
    expect(html).toContain('Modal')
    expect(sibling.hasAttribute('inert')).toBe(false)
    expect(setAttributeSpy).not.toHaveBeenCalled()
    setAttributeSpy.mockRestore()
  })

  it('walks up to body and marks non-kept siblings inert while preserving ancestors', async () => {
    const header = appendToBody('<header>Header</header>')
    const app = appendToBody(`
      <div id="app">
        <nav>Nav</nav>
        <section id="section">
          <aside>Aside</aside>
          <div id="kept">Kept dialog</div>
        </section>
      </div>
    `)
    const footer = appendToBody('<footer>Footer</footer>')
    const queryRequired = (selector: string): HTMLElement => {
      const found = app.querySelector<HTMLElement>(selector)
      if (!found) {
        throw new Error(`Expected element matching ${selector}`)
      }
      return found
    }

    const nav = queryRequired('nav')
    const section = queryRequired('#section')
    const aside = queryRequired('aside')
    const kept = queryRequired('#kept')

    const enabled = ref(false)
    mountInert(
      () => kept,
      () => enabled.value,
    )

    expect(header.hasAttribute('inert')).toBe(false)
    expect(nav.hasAttribute('inert')).toBe(false)
    expect(aside.hasAttribute('inert')).toBe(false)

    enabled.value = true
    await nextTick()

    expect(header.hasAttribute('inert')).toBe(true)
    expect(footer.hasAttribute('inert')).toBe(true)
    expect(nav.hasAttribute('inert')).toBe(true)
    expect(aside.hasAttribute('inert')).toBe(true)

    expect(app.hasAttribute('inert')).toBe(false)
    expect(section.hasAttribute('inert')).toBe(false)
    expect(kept.hasAttribute('inert')).toBe(false)
    expect(document.body.hasAttribute('inert')).toBe(false)

    enabled.value = false
    await nextTick()

    expect(header.hasAttribute('inert')).toBe(false)
    expect(footer.hasAttribute('inert')).toBe(false)
    expect(nav.hasAttribute('inert')).toBe(false)
    expect(aside.hasAttribute('inert')).toBe(false)
  })

  it('skips [data-ghost-live] siblings and leaves pre-existing inert attributes alone', async () => {
    const background = appendToBody('<main>Background</main>')
    const preInert = appendToBody('<section inert>Already inert</section>')
    const live = appendToBody('<div data-ghost-live>Live toast</div>')
    const modal = appendToBody('<div role="dialog">Modal</div>')

    const enabled = ref(true)
    const wrapper = mountInert(modal, () => enabled.value)

    expect(background.hasAttribute('inert')).toBe(true)
    expect(preInert.hasAttribute('inert')).toBe(true)
    expect(live.hasAttribute('inert')).toBe(false)
    expect(modal.hasAttribute('inert')).toBe(false)

    enabled.value = false
    await nextTick()

    expect(background.hasAttribute('inert')).toBe(false)
    expect(preInert.hasAttribute('inert')).toBe(true)
    expect(live.hasAttribute('inert')).toBe(false)

    enabled.value = true
    await nextTick()
    expect(background.hasAttribute('inert')).toBe(true)

    wrapper.unmount()
    expect(background.hasAttribute('inert')).toBe(false)
    expect(preInert.hasAttribute('inert')).toBe(true)
  })

  it('ref-counts per element across nested activations and multiple kept elements', async () => {
    const bg = appendToBody('<main>Background</main>')
    const extraKept = appendToBody('<div>Toolbar</div>')
    const modal1 = appendToBody('<div role="dialog">Modal 1</div>')

    const first = ref(true)
    const second = ref(false)

    mountInert([modal1, extraKept], () => first.value)
    expect(bg.hasAttribute('inert')).toBe(true)
    expect(extraKept.hasAttribute('inert')).toBe(false)
    expect(modal1.hasAttribute('inert')).toBe(false)

    // Modal 2 mounts after Modal 1 is already active, so Modal 1 leaves it untouched.
    const modal2 = appendToBody('<div role="dialog">Modal 2</div>')
    expect(modal2.hasAttribute('inert')).toBe(false)

    second.value = true
    const secondWrapper = mountInert(
      () => modal2,
      () => second.value,
    )
    await nextTick()

    // Inner activation keeps shared background inert and makes modal1 + extraKept inert.
    expect(bg.hasAttribute('inert')).toBe(true)
    expect(modal1.hasAttribute('inert')).toBe(true)
    expect(extraKept.hasAttribute('inert')).toBe(true)
    expect(modal2.hasAttribute('inert')).toBe(false)

    // Disabling inner restores modal1 and extraKept while keeping bg inert for outer.
    second.value = false
    await nextTick()
    expect(bg.hasAttribute('inert')).toBe(true)
    expect(modal1.hasAttribute('inert')).toBe(false)
    expect(extraKept.hasAttribute('inert')).toBe(false)

    secondWrapper.unmount()
    expect(bg.hasAttribute('inert')).toBe(true)

    first.value = false
    await nextTick()
    expect(bg.hasAttribute('inert')).toBe(false)
    expect(modal2.hasAttribute('inert')).toBe(false)
  })

  it('does not touch nodes added after activation', async () => {
    const bg = appendToBody('<main>Background</main>')
    const modal = appendToBody('<div role="dialog">Modal</div>')
    const unrelatedTick = ref(0)
    const enabled = ref(true)

    const wrapper = mountInert(
      () => {
        void unrelatedTick.value
        return [modal]
      },
      () => enabled.value,
    )

    expect(bg.hasAttribute('inert')).toBe(true)

    const latePopover = appendToBody('<div role="dialog">Late popover</div>')
    expect(latePopover.hasAttribute('inert')).toBe(false)

    // Unrelated reactive re-evaluation with the same kept elements must not inert latePopover.
    unrelatedTick.value = 1
    await nextTick()
    expect(latePopover.hasAttribute('inert')).toBe(false)

    wrapper.unmount()
    expect(bg.hasAttribute('inert')).toBe(false)
    expect(latePopover.hasAttribute('inert')).toBe(false)
  })
})
