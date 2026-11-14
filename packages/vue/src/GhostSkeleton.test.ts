import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostSkeleton from './GhostSkeleton.vue'
import type { GhostSkeletonElement } from './ghost-skeleton'

describe('GhostSkeleton', () => {
  describe('WCAG 1.3.1 Info and Relationships', () => {
    it('hides the placeholder from the accessibility tree', () => {
      const wrapper = mount(GhostSkeleton)
      const root = wrapper.get('span').element

      expect(root.getAttribute('aria-hidden')).toBe('true')
      expect(root.hasAttribute('role')).toBe(false)
      expect(root.getAttribute('aria-busy')).toBeNull()
      expect(root.getAttribute('aria-live')).toBeNull()
    })
  })

  describe('WCAG 2.1.1 Keyboard', () => {
    it('is inert and not a tab stop', () => {
      const wrapper = mount(GhostSkeleton, {
        slots: { default: '<button type="button">Retry</button>' },
      })
      const root = wrapper.get('span').element

      expect(root.hasAttribute('inert')).toBe(true)
      expect(root.hasAttribute('tabindex')).toBe(false)
    })
  })

  describe('WCAG 4.1.2 Name, Role, Value', () => {
    it('adds no role of its own', () => {
      const wrapper = mount(GhostSkeleton)

      expect(wrapper.get('span').element.hasAttribute('role')).toBe(false)
    })

    it('forwards class, style, and visual shape hooks', () => {
      const wrapper = mount(GhostSkeleton, {
        attrs: {
          class: 'row-bone',
          style: 'inline-size: 8rem',
          'data-shape': 'circle',
          'data-testid': 'bone',
        },
      })
      const root = wrapper.get('span').element

      expect(wrapper.get('span').classes()).toContain('ghost-skeleton')
      expect(wrapper.get('span').classes()).toContain('row-bone')
      expect(root.getAttribute('data-shape')).toBe('circle')
      expect(root.getAttribute('data-testid')).toBe('bone')
      expect(root.style.inlineSize).toBe('8rem')
    })
  })

  describe('WCAG 4.1.3 Status Messages', () => {
    it('does not set live-region or busy semantics', () => {
      const wrapper = mount(GhostSkeleton)
      const root = wrapper.get('span').element

      expect(root.getAttribute('aria-live')).toBeNull()
      expect(root.getAttribute('aria-busy')).toBeNull()
      expect(root.getAttribute('role')).not.toBe('status')
      expect(root.getAttribute('role')).not.toBe('progressbar')
    })
  })

  describe('rendering contract', () => {
    it.each<GhostSkeletonElement>(['span', 'div', 'p', 'li', 'td', 'th'])(
      'renders %s as its only root element',
      (as) => {
        const wrapper = mount(GhostSkeleton, { props: { as } })

        const html = wrapper.html()
        expect(html.startsWith(`<${as} `)).toBe(true)
        expect(html.endsWith(`</${as}>`)).toBe(true)
      },
    )

    it('renders an empty slot as inert markup rather than failing', () => {
      const wrapper = mount(GhostSkeleton)

      expect(wrapper.get('span').element.textContent).toBe('')
    })

    it('keeps aria-hidden and inert when a consumer tries to unset them', () => {
      const wrapper = mount(GhostSkeleton, {
        attrs: { 'aria-hidden': 'false', inert: false },
      })
      const root = wrapper.get('span').element

      // Fallthrough cannot un-hide the placeholder; noisy AT output is the failure mode.
      expect(root.getAttribute('aria-hidden')).toBe('true')
      expect(root.hasAttribute('inert')).toBe(true)
    })

    it('exposes data-part without inventing a data-state', () => {
      const wrapper = mount(GhostSkeleton)
      const root = wrapper.get('span').element

      expect(root.getAttribute('data-part')).toBe('root')
      expect(root.hasAttribute('data-state')).toBe(false)
    })
  })

  describe('server rendering', () => {
    it('renders deterministic hidden markup without browser globals', async () => {
      const html = await renderToString(h(GhostSkeleton, { as: 'td' }))

      expect(html).toContain('class="ghost-skeleton"')
      expect(html).toContain('data-part="root"')
      expect(html).toContain('aria-hidden="true"')
      expect(html).toContain('inert')
      expect(html.startsWith('<td ')).toBe(true)
      expect(html).not.toContain('aria-busy')
      expect(html).not.toContain('aria-live')
    })
  })

  describe('cleanup', () => {
    it('removes its element on unmount', () => {
      const wrapper = mount(GhostSkeleton, { attachTo: document.body })
      const root = wrapper.get('span').element

      wrapper.unmount()

      expect(document.body.contains(root)).toBe(false)
    })
  })

  describe('document order', () => {
    it('occupies its authored position between siblings', () => {
      const harness = defineComponent({
        render() {
          return h('p', ['Before ', h(GhostSkeleton), ' after'])
        },
      })

      const wrapper = mount(harness)

      expect(wrapper.text()).toBe('Before  after')
      expect(wrapper.get('.ghost-skeleton').element).toBeTruthy()
    })
  })
})
