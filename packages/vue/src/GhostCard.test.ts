import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GhostButton from './GhostButton.vue'
import GhostCard from './GhostCard.vue'
import type { GhostCardExposed } from './ghost-card'
import { useGhostCard } from './use-ghost-card'

afterEach(() => {
  vi.unstubAllGlobals()
})

function stubFinePointer() {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    media: query,
  }))
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
}

describe('GhostCard', () => {
  describe('structure', () => {
    it('renders header, content, and footer parts in order', () => {
      const wrapper = mount(GhostCard, {
        slots: {
          header: 'Header',
          default: 'Body',
          footer: 'Footer',
        },
      })

      const parts = wrapper
        .findAll('[data-part]')
        .map((node) => node.attributes('data-part'))
      expect(parts).toEqual(['root', 'header', 'content', 'footer'])
      expect(wrapper.text()).toBe('HeaderBodyFooter')
    })

    it('omits empty part wrappers', () => {
      const wrapper = mount(GhostCard, {
        slots: { default: 'Only body' },
      })

      expect(wrapper.find('[data-part="header"]').exists()).toBe(false)
      expect(wrapper.find('[data-part="footer"]').exists()).toBe(false)
      expect(wrapper.get('[data-part="content"]').text()).toBe('Only body')
    })

    it('sets ghost-card hooks on the root', () => {
      const wrapper = mount(GhostCard, {
        slots: { default: 'Body' },
      })
      const root = wrapper.get('[data-part="root"]')

      expect(root.classes()).toContain('ghost-card')
      expect(root.attributes('data-ghost-card')).toBe('')
    })
  })

  describe('spotlight', () => {
    it('renders glow and data-interactive when effects include spotlight', () => {
      stubFinePointer()
      const wrapper = mount(GhostCard, {
        props: { effects: ['spotlight'] },
        slots: { default: 'Report' },
      })

      expect(wrapper.attributes('data-interactive')).toBe('spotlight')
      expect(wrapper.get('[data-part="glow"]').attributes('aria-hidden')).toBe(
        'true',
      )
      wrapper.unmount()
    })

    it('stays inert when effects is empty', () => {
      stubFinePointer()
      const wrapper = mount(GhostCard, {
        props: { effects: [] },
        slots: { default: 'Static' },
      })

      expect(wrapper.find('[data-part="glow"]').exists()).toBe(false)
      expect(wrapper.attributes('data-interactive')).toBe('')
      wrapper.unmount()
    })
  })

  describe('action roots', () => {
    it('renders a navigational card as a single link', () => {
      const wrapper = mount(GhostCard, {
        props: { as: 'a' },
        attrs: { href: '/reports/q3' },
        slots: {
          header: 'Q3 report',
          default: 'Revenue summary',
        },
      })

      const root = wrapper.get('a')
      expect(root.attributes('href')).toBe('/reports/q3')
      expect(root.attributes('data-part')).toBe('root')
      expect(root.findAll('div')).toHaveLength(0)
      expect(wrapper.get('[data-part="header"]').element.tagName).toBe('SPAN')
    })

    it('uses span part wrappers on a button root with no div descendants', () => {
      const wrapper = mount(GhostCard, {
        props: { as: 'button' },
        slots: {
          header: 'Save draft',
          default: 'Resume editing',
        },
      })

      const root = wrapper.get('button')
      expect(root.findAll('div')).toHaveLength(0)
      expect(wrapper.get('[data-part="content"]').element.tagName).toBe('SPAN')
    })

    it('defaults button type to button without overriding consumer type', () => {
      const defaultType = mount(GhostCard, {
        props: { as: 'button' },
        slots: { default: 'Act' },
      })
      expect(defaultType.get('button').attributes('type')).toBe('button')

      const submitType = mount(GhostCard, {
        props: { as: 'button' },
        attrs: { type: 'submit' },
        slots: { default: 'Submit' },
      })
      expect(submitType.get('button').attributes('type')).toBe('submit')
    })
  })

  describe('WCAG 2.1.1 Keyboard', () => {
    it('keeps footer actions focusable on a static root', () => {
      const wrapper = mount(GhostCard, {
        attachTo: document.body,
        slots: {
          default: 'Body',
          footer: () =>
            h(GhostButton, { id: 'card-action' }, () => 'Open settings'),
        },
      })

      const button = wrapper.get('#card-action').element as HTMLButtonElement
      button.focus()
      expect(document.activeElement).toBe(button)
      wrapper.unmount()
    })
  })

  describe('WCAG 4.1.2 Name, Role, Value', () => {
    it('does not assign a redundant role on a static root', () => {
      const wrapper = mount(GhostCard, {
        slots: { default: 'Body' },
      })

      expect(
        wrapper.get('[data-part="root"]').attributes('role'),
      ).toBeUndefined()
    })
  })

  it('exposes the root element after mount', () => {
    stubFinePointer()
    const wrapper = mount(GhostCard, {
      attachTo: document.body,
      slots: { default: 'Body' },
    })
    const exposed = wrapper.vm as unknown as GhostCardExposed

    expect(exposed.element).toBe(wrapper.element)
    wrapper.unmount()
  })

  it('renders deterministic off-state markup during SSR', async () => {
    const html = await renderToString(
      h(GhostCard, { effects: ['spotlight'] }, { default: () => 'Report' }),
    )

    expect(html).toContain('data-part="root"')
    expect(html).toContain('data-ghost-card')
    expect(html).toContain('data-interactive-state="off"')
  })
})

describe('useGhostCard', () => {
  it('flags action roots', () => {
    const Host = defineComponent({
      setup() {
        const link = useGhostCard({ as: () => 'a' })
        const article = useGhostCard({ as: () => 'article' })
        return () =>
          h('div', [
            h('span', { 'data-link': '' }, () =>
              String(link.isActionRoot.value),
            ),
            h('span', { 'data-article': '' }, () =>
              String(article.isActionRoot.value),
            ),
          ])
      },
    })
    const wrapper = mount(Host)

    expect(wrapper.get('[data-link]').text()).toBe('true')
    expect(wrapper.get('[data-article]').text()).toBe('false')
  })
})
