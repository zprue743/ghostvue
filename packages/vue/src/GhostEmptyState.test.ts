import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'

import GhostButton from './GhostButton.vue'
import GhostEmptyState from './GhostEmptyState.vue'
import type {
  GhostEmptyStateExposed,
  GhostEmptyStateHeadingLevel,
} from './ghost-empty-state'
import { useGhostEmptyState } from './use-ghost-empty-state'

describe('GhostEmptyState', () => {
  describe('WCAG 1.3.1 Info and Relationships', () => {
    it.each<GhostEmptyStateHeadingLevel>([1, 2, 3, 4, 5, 6])(
      'renders the title at heading level %s',
      (headingLevel) => {
        const wrapper = mount(GhostEmptyState, {
          props: { headingLevel },
          slots: { title: 'No reports yet' },
        })

        expect(wrapper.get(`h${String(headingLevel)}`).text()).toBe(
          'No reports yet',
        )
      },
    )

    it('omits aria-labelledby on a div root even when a title is present', () => {
      const wrapper = mount(GhostEmptyState, {
        slots: { title: 'Empty folder' },
      })
      const root = wrapper.get('[data-part="root"]').element

      expect(root.tagName).toBe('DIV')
      expect(root.getAttribute('aria-labelledby')).toBeNull()
    })

    it('links a section root to the title with aria-labelledby', () => {
      const wrapper = mount(GhostEmptyState, {
        props: { as: 'section' },
        slots: { title: 'Empty folder' },
      })
      const root = wrapper.get('[data-part="root"]').element
      const title = wrapper.get('[data-part="title"]').element

      expect(root.tagName).toBe('SECTION')
      expect(root.getAttribute('aria-labelledby')).toBe(title.id)
      expect(title.tagName).toBe('H3')
    })

    it('omits aria-labelledby when the title slot is absent', () => {
      const wrapper = mount(GhostEmptyState, {
        slots: { description: 'Try another filter.' },
      })

      expect(
        wrapper.get('[data-part="root"]').attributes('aria-labelledby'),
      ).toBeUndefined()
    })
  })

  describe('WCAG 2.1.1 Keyboard', () => {
    it('keeps action controls focusable in document order', () => {
      const wrapper = mount(GhostEmptyState, {
        attachTo: document.body,
        slots: {
          title: 'No matches',
          actions: () =>
            h(GhostButton, { id: 'clear-filter' }, () => 'Clear filter'),
        },
      })

      const button = wrapper.get('#clear-filter').element as HTMLButtonElement
      button.focus()
      expect(document.activeElement).toBe(button)
      wrapper.unmount()
    })
  })

  describe('WCAG 4.1.2 Name, Role, Value', () => {
    it('hides the visual wrapper from the accessibility tree', () => {
      const wrapper = mount(GhostEmptyState, {
        slots: {
          visual: '<svg aria-hidden="false"></svg>',
          title: 'Nothing here',
        },
      })

      expect(
        wrapper.get('[data-part="visual"]').attributes('aria-hidden'),
      ).toBe('true')
    })

    it('does not assign a redundant role on the root', () => {
      const wrapper = mount(GhostEmptyState, {
        slots: { title: 'No data' },
      })

      expect(
        wrapper.get('[data-part="root"]').attributes('role'),
      ).toBeUndefined()
    })

    it('forwards native attrs to the root', () => {
      const wrapper = mount(GhostEmptyState, {
        attrs: { class: 'panel-empty', 'data-testid': 'empty' },
        slots: { title: 'No rows' },
      })

      const root = wrapper.get('[data-part="root"]')
      expect(root.classes()).toContain('ghost-empty-state')
      expect(root.classes()).toContain('panel-empty')
      expect(root.attributes('data-testid')).toBe('empty')
      expect(root.attributes('data-ghost-empty-state')).toBe('')
    })
  })

  describe('rendering contract', () => {
    it('renders parts in visual, title, description, actions order', () => {
      const wrapper = mount(GhostEmptyState, {
        slots: {
          visual: 'V',
          title: 'T',
          description: 'D',
          actions: 'A',
        },
      })

      const parts = wrapper
        .findAll('[data-part]')
        .map((node) => node.attributes('data-part'))

      expect(parts).toEqual([
        'root',
        'visual',
        'title',
        'description',
        'actions',
      ])
    })

    it('omits absent slot wrappers', () => {
      const wrapper = mount(GhostEmptyState, {
        slots: { title: 'Only title' },
      })

      expect(wrapper.find('[data-part="visual"]').exists()).toBe(false)
      expect(wrapper.find('[data-part="description"]').exists()).toBe(false)
      expect(wrapper.find('[data-part="actions"]').exists()).toBe(false)
    })

    it('supports section roots for landmark regions', () => {
      const wrapper = mount(GhostEmptyState, {
        props: { as: 'section' },
        slots: { title: 'Empty dataset' },
      })

      expect(wrapper.get('[data-part="root"]').element.tagName).toBe('SECTION')
    })

    it('exposes the mounted root element after mount and null after unmount', () => {
      const wrapper = mount(GhostEmptyState, {
        attachTo: document.body,
        slots: { title: 'No items' },
      })
      const exposed = wrapper.vm as unknown as GhostEmptyStateExposed

      expect(exposed.element).toBe(wrapper.get('[data-part="root"]').element)
      wrapper.unmount()
      expect(exposed.element).toBeNull()
    })
  })

  describe('SSR', () => {
    it('renders stable markup on the server', async () => {
      const html = await renderToString(
        h(
          GhostEmptyState,
          { headingLevel: 2 },
          {
            title: () => 'No results',
            description: () => 'Adjust your filters.',
          },
        ),
      )

      expect(html).toContain('data-ghost-empty-state')
      expect(html).toContain('<h2')
      expect(html).toContain('No results')
      expect(html).toContain('Adjust your filters.')
    })
  })
})

describe('useGhostEmptyState', () => {
  it('adds aria-labelledby only when as is section', () => {
    const SectionHost = defineComponent({
      setup() {
        const api = useGhostEmptyState({
          as: 'section',
          headingLevel: 4,
          hasTitle: true,
        })
        return api
      },
      template: `<component :is="as" v-bind="rootProps"><component :is="headingTag" :id="titleId">Title</component></component>`,
    })

    const section = mount(SectionHost)
    expect(section.find('h4').exists()).toBe(true)
    expect(section.get('section').attributes('aria-labelledby')).toBeDefined()

    const DivHost = defineComponent({
      setup() {
        const api = useGhostEmptyState({
          as: 'div',
          hasTitle: true,
        })
        return api
      },
      template: `<component :is="as" v-bind="rootProps" />`,
    })

    const div = mount(DivHost)
    expect(div.get('div').attributes('aria-labelledby')).toBeUndefined()
  })
})
