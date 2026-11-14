import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostButton from './GhostButton.vue'
import GhostInlineAlert from './GhostInlineAlert.vue'
import type {
  GhostInlineAlertExposed,
  GhostInlineAlertHeadingLevel,
} from './ghost-inline-alert'
import { useGhostInlineAlert } from './use-ghost-inline-alert'

describe('GhostInlineAlert', () => {
  describe('WCAG 1.3.1 Info and Relationships', () => {
    it.each<GhostInlineAlertHeadingLevel>([1, 2, 3, 4, 5, 6])(
      'renders the title at heading level %s',
      (headingLevel) => {
        const wrapper = mount(GhostInlineAlert, {
          props: { headingLevel },
          slots: {
            title: 'Rows could not load',
            message: 'Check your connection.',
          },
        })

        expect(wrapper.get(`h${String(headingLevel)}`).text()).toBe(
          'Rows could not load',
        )
      },
    )

    it('omits aria-labelledby on a div root even when a title is present', () => {
      const wrapper = mount(GhostInlineAlert, {
        slots: {
          title: 'Save failed',
          message: 'Try again.',
        },
      })
      const root = wrapper.get('[data-part="root"]').element

      expect(root.tagName).toBe('DIV')
      expect(root.getAttribute('aria-labelledby')).toBeNull()
    })

    it('links a section root to the title when announce is off', () => {
      const wrapper = mount(GhostInlineAlert, {
        props: { as: 'section', announce: 'off' },
        slots: {
          title: 'Mutation failed',
          message: 'One row was not updated.',
        },
      })
      const root = wrapper.get('[data-part="root"]').element
      const title = wrapper.get('[data-part="title"]').element

      expect(root.tagName).toBe('SECTION')
      expect(root.getAttribute('aria-labelledby')).toBe(title.id)
      expect(title.tagName).toBe('H3')
    })
  })

  describe('live region semantics', () => {
    it('does not set a role when announce is off', () => {
      const wrapper = mount(GhostInlineAlert, {
        slots: { message: 'Filters are active.' },
      })

      expect(
        wrapper.get('[data-part="root"]').attributes('role'),
      ).toBeUndefined()
    })

    it('sets role="status" when announce is status', () => {
      const wrapper = mount(GhostInlineAlert, {
        props: { announce: 'status' },
        slots: { message: 'Two rows recovered.' },
      })

      expect(wrapper.get('[data-part="root"]').attributes('role')).toBe(
        'status',
      )
      expect(
        wrapper.get('[data-part="root"]').attributes('aria-labelledby'),
      ).toBeUndefined()
    })

    it('sets role="alert" when announce is alert', () => {
      const wrapper = mount(GhostInlineAlert, {
        props: { announce: 'alert' },
        slots: {
          title: 'Load failed',
          message: 'The table could not refresh.',
        },
      })

      expect(wrapper.get('[data-part="root"]').attributes('role')).toBe('alert')
    })
  })

  describe('WCAG 2.1.1 Keyboard', () => {
    it('keeps action controls focusable in document order', () => {
      const wrapper = mount(GhostInlineAlert, {
        attachTo: document.body,
        slots: {
          message: 'Could not save.',
          actions: () =>
            h(GhostButton, { id: 'retry-save' }, () => 'Retry save'),
        },
      })

      const button = wrapper.get('#retry-save').element as HTMLButtonElement
      button.focus()
      expect(document.activeElement).toBe(button)
      wrapper.unmount()
    })
  })

  describe('WCAG 4.1.2 Name, Role, Value', () => {
    it('forwards native attrs to the root', async () => {
      const onClick = vi.fn()
      const wrapper = mount(GhostInlineAlert, {
        attrs: {
          class: 'table-error',
          'data-testid': 'load-error',
          onClick,
        },
        slots: { message: 'Rows unavailable.' },
      })

      const root = wrapper.get('[data-part="root"]')
      await root.trigger('click')
      expect(root.classes()).toContain('ghost-inline-alert')
      expect(root.classes()).toContain('table-error')
      expect(root.attributes('data-testid')).toBe('load-error')
      expect(root.attributes('data-ghost-inline-alert')).toBe('')
      expect(onClick).toHaveBeenCalledOnce()
    })
  })

  describe('rendering contract', () => {
    it('renders parts in title, message, actions order', () => {
      const wrapper = mount(GhostInlineAlert, {
        slots: {
          title: 'T',
          message: 'M',
          actions: 'A',
        },
      })

      const parts = wrapper
        .findAll('[data-part]')
        .map((node) => node.attributes('data-part'))

      expect(parts).toEqual(['root', 'title', 'message', 'actions'])
    })

    it('omits absent slot wrappers', () => {
      const wrapper = mount(GhostInlineAlert, {
        slots: { message: 'Only message' },
      })

      expect(wrapper.find('[data-part="title"]').exists()).toBe(false)
      expect(wrapper.find('[data-part="actions"]').exists()).toBe(false)
    })

    it('exposes the mounted root element after mount and null after unmount', () => {
      const wrapper = mount(GhostInlineAlert, {
        attachTo: document.body,
        slots: { message: 'Static feedback.' },
      })
      const exposed = wrapper.vm as unknown as GhostInlineAlertExposed

      expect(exposed.element).toBe(wrapper.get('[data-part="root"]').element)
      wrapper.unmount()
      expect(exposed.element).toBeNull()
    })
  })

  describe('SSR', () => {
    it('renders stable markup on the server', async () => {
      const html = await renderToString(
        h(
          GhostInlineAlert,
          { announce: 'alert', headingLevel: 2 },
          {
            title: () => 'Save failed',
            message: () => 'Your changes were not persisted.',
          },
        ),
      )

      expect(html).toContain('data-ghost-inline-alert')
      expect(html).toContain('role="alert"')
      expect(html).toContain('<h2')
      expect(html).toContain('Save failed')
      expect(html).toContain('Your changes were not persisted.')
    })
  })
})

describe('useGhostInlineAlert', () => {
  it('adds aria-labelledby only for section roots when announce is off', () => {
    const SectionHost = defineComponent({
      setup() {
        return useGhostInlineAlert({
          as: 'section',
          headingLevel: 4,
          announce: 'off',
          hasTitle: true,
        })
      },
      template: `<component :is="as" v-bind="rootProps"><component :is="headingTag" :id="titleId">Title</component></component>`,
    })

    const section = mount(SectionHost)
    expect(section.get('section').attributes('aria-labelledby')).toBeDefined()

    const DivHost = defineComponent({
      setup() {
        return useGhostInlineAlert({
          as: 'div',
          announce: 'off',
          hasTitle: true,
        })
      },
      template: `<component :is="as" v-bind="rootProps" />`,
    })

    const div = mount(DivHost)
    expect(div.get('div').attributes('aria-labelledby')).toBeUndefined()
  })

  it('prefers live role over section labelling', () => {
    const Host = defineComponent({
      setup() {
        return useGhostInlineAlert({
          as: 'section',
          announce: 'alert',
          hasTitle: true,
        })
      },
      template: `<component :is="as" v-bind="rootProps" />`,
    })

    const wrapper = mount(Host)
    expect(wrapper.get('section').attributes('role')).toBe('alert')
    expect(wrapper.get('section').attributes('aria-labelledby')).toBeUndefined()
  })
})
