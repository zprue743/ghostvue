import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import SlVisuallyHidden from './SlVisuallyHidden.vue'
import type { SlVisuallyHiddenElement } from './sl-visually-hidden'

const SKIP_LINK = '<a href="#main">Skip to content</a>'

// jsdom has no layout or accessible-name computation; perception lives in e2e.
describe('SlVisuallyHidden', () => {
  describe('WCAG 1.3.1 Info and Relationships', () => {
    it('keeps content in the accessibility tree', () => {
      const wrapper = mount(SlVisuallyHidden, {
        slots: { default: 'Delete row 3' },
      })
      const root = wrapper.get('span').element

      expect(root.getAttribute('aria-hidden')).toBeNull()
      expect(root.hasAttribute('hidden')).toBe(false)
      expect(root.style.display).not.toBe('none')
      expect(root.style.visibility).not.toBe('hidden')
      expect(root.textContent).toBe('Delete row 3')
    })
  })

  describe('WCAG 1.3.2 Meaningful Sequence', () => {
    it('reads in document order at its authored position', () => {
      const harness = defineComponent({
        render() {
          return h('p', [
            'Column ',
            h(SlVisuallyHidden, null, { default: () => 'sorted ascending' }),
            ' header',
          ])
        },
      })

      const wrapper = mount(harness)

      expect(wrapper.text()).toBe('Column sorted ascending header')
    })
  })

  describe('WCAG 1.4.4 Resize Text', () => {
    it('constrains its own box without constraining text size', () => {
      const wrapper = mount(SlVisuallyHidden, { slots: { default: 'Sort' } })
      const root = wrapper.get('span').element

      expect(root.style.fontSize).toBe('')
      // 1px not 0: some engines drop zero-area boxes from the accessibility tree.
      expect(root.style.width).toBe('1px')
      expect(root.style.height).toBe('1px')
    })
  })

  describe('WCAG 1.4.10 Reflow', () => {
    it('cannot introduce scrollable overflow', () => {
      const wrapper = mount(SlVisuallyHidden, {
        slots: { default: 'A long label that would otherwise wrap' },
      })
      const root = wrapper.get('span').element

      expect(root.style.overflow).toBe('hidden')
      expect(root.style.whiteSpace).toBe('nowrap')
      expect(root.style.position).toBe('absolute')
    })
  })

  describe('WCAG 1.4.12 Text Spacing', () => {
    it('sets no text spacing a consumer stylesheet could need to override', () => {
      const wrapper = mount(SlVisuallyHidden, { slots: { default: 'Sort' } })
      const root = wrapper.get('span').element

      expect(root.style.lineHeight).toBe('')
      expect(root.style.letterSpacing).toBe('')
      expect(root.style.wordSpacing).toBe('')
    })
  })

  describe('WCAG 2.1.1 Keyboard and 2.4.7 Focus Visible', () => {
    it('reveals focusable content while focus is inside it', async () => {
      const wrapper = mount(SlVisuallyHidden, {
        attachTo: document.body,
        props: { focusable: true },
        slots: { default: SKIP_LINK },
      })
      const root = wrapper.get('span').element

      expect(root.style.position).toBe('absolute')
      expect(root.getAttribute('data-state')).toBe('hidden')

      // Skip-link reveal depends on `focusin` bubbling from the descendant.
      await wrapper.get('a').trigger('focusin')

      expect(root.style.position).toBe('')
      expect(root.hasAttribute('data-state')).toBe(false)

      await wrapper.get('a').trigger('focusout')

      expect(root.style.position).toBe('absolute')
      expect(root.getAttribute('data-state')).toBe('hidden')

      wrapper.unmount()
    })

    it('stays hidden on focus unless the consumer opts in', async () => {
      const wrapper = mount(SlVisuallyHidden, {
        attachTo: document.body,
        slots: { default: SKIP_LINK },
      })
      const root = wrapper.get('span').element

      await wrapper.get('a').trigger('focusin')

      expect(root.style.position).toBe('absolute')

      wrapper.unmount()
    })

    it('resolves correctly when focusable changes while focus is inside', async () => {
      const wrapper = mount(SlVisuallyHidden, {
        attachTo: document.body,
        props: { focusable: false },
        slots: { default: SKIP_LINK },
      })
      const root = wrapper.get('span').element

      await wrapper.get('a').trigger('focusin')
      expect(root.style.position).toBe('absolute')

      // Tracking while hidden means enabling `focusable` with focus inside reveals now.
      await wrapper.setProps({ focusable: true })
      expect(root.style.position).toBe('')

      await wrapper.setProps({ focusable: false })
      expect(root.style.position).toBe('absolute')

      wrapper.unmount()
    })
  })

  describe('WCAG 4.1.2 Name, Role, Value', () => {
    it('adds no role of its own', () => {
      const wrapper = mount(SlVisuallyHidden, {
        slots: { default: 'Delete row 3' },
      })

      expect(wrapper.get('span').element.hasAttribute('role')).toBe(false)
    })

    it('forwards the attributes that build naming relationships', () => {
      const wrapper = mount(SlVisuallyHidden, {
        attrs: { id: 'row-3-label', lang: 'en', 'data-testid': 'label' },
        slots: { default: 'Delete row 3' },
      })
      const root = wrapper.get('span').element

      expect(root.getAttribute('id')).toBe('row-3-label')
      expect(root.getAttribute('lang')).toBe('en')
      expect(root.getAttribute('data-testid')).toBe('label')
    })
  })

  describe('WCAG 4.1.3 Status Messages', () => {
    it('forwards live-region attributes unmodified', async () => {
      const attrs = {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true',
      }
      const wrapper = mount(SlVisuallyHidden, { attrs })
      const root = wrapper.get('span').element

      expect(root.getAttribute('role')).toBe('status')
      expect(root.getAttribute('aria-live')).toBe('polite')
      expect(root.getAttribute('aria-atomic')).toBe('true')

      const html = await renderToString(h(SlVisuallyHidden, attrs))
      expect(html).toContain('role="status"')
      expect(html).toContain('aria-live="polite"')
    })
  })

  describe('rendering contract', () => {
    it.each<SlVisuallyHiddenElement>(['span', 'div', 'p', 'li', 'td', 'th'])(
      'renders %s as its only root element',
      (as) => {
        const wrapper = mount(SlVisuallyHidden, {
          props: { as },
          slots: { default: 'Delete row 3' },
        })

        const html = wrapper.html()
        expect(html.startsWith(`<${as} `)).toBe(true)
        expect(html.endsWith(`</${as}>`)).toBe(true)
      },
    )

    it('applies the clip technique rather than a layout-affecting alternative', () => {
      const wrapper = mount(SlVisuallyHidden, { slots: { default: 'Sort' } })
      const root = wrapper.get('span').element

      expect(root.style.margin).toBe('-1px')
      expect(root.style.clipPath).toBe('inset(50%)')
      // `clip` accessor is deprecated; jsdom rewrites `rect(0 0 0 0)`.
      expect(root.style.getPropertyValue('clip')).not.toBe('')
      expect(root.style.textIndent).toBe('')
    })

    it('renders an empty slot as inert markup rather than failing', () => {
      const wrapper = mount(SlVisuallyHidden)

      expect(wrapper.get('span').element.textContent).toBe('')
    })

    it('lets a consumer style binding win on a conflicting declaration', () => {
      const wrapper = mount(SlVisuallyHidden, {
        attrs: { style: 'position: static' },
        slots: { default: 'Sort' },
      })
      const root = wrapper.get('span').element

      expect(root.style.position).toBe('static')
      expect(root.style.width).toBe('1px')
      expect(root.style.overflow).toBe('hidden')
    })

    it('forwards classes for consumer styling', () => {
      const wrapper = mount(SlVisuallyHidden, {
        attrs: { class: 'table-label' },
        slots: { default: 'Sort' },
      })

      expect(wrapper.get('span').classes()).toContain('table-label')
      expect(wrapper.get('span').classes()).toContain('slop-visually-hidden')
    })

    it('exposes data-part and hidden data-state as styling hooks', () => {
      const wrapper = mount(SlVisuallyHidden, { slots: { default: 'Sort' } })
      const root = wrapper.get('span').element

      expect(root.getAttribute('data-part')).toBe('root')
      expect(root.getAttribute('data-state')).toBe('hidden')
    })
  })

  describe('server rendering', () => {
    it('renders hidden, deterministic markup without browser globals', async () => {
      const html = await renderToString(
        h(SlVisuallyHidden, null, { default: () => 'Delete row 3' }),
      )

      expect(html).toContain('Delete row 3')
      expect(html).toContain('position:absolute')
      expect(html).toContain('data-state="hidden"')
      expect(html).toContain('data-part="root"')
      expect(html).not.toContain('display:none')
      expect(html).not.toContain('visibility:hidden')
    })

    it('renders focusable content hidden on the server', async () => {
      const html = await renderToString(
        h(SlVisuallyHidden, { focusable: true }, { default: () => 'Skip' }),
      )

      expect(html).toContain('position:absolute')
    })
  })

  describe('cleanup', () => {
    it('removes its element and listeners on unmount', () => {
      const wrapper = mount(SlVisuallyHidden, {
        attachTo: document.body,
        props: { focusable: true },
        slots: { default: SKIP_LINK },
      })
      const root = wrapper.get('span').element

      wrapper.unmount()

      expect(document.body.contains(root)).toBe(false)
      expect(() => {
        root.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      }).not.toThrow()
      expect(root.style.position).toBe('absolute')
    })
  })
})
