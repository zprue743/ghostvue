import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostSpinner from './GhostSpinner.vue'

describe('GhostSpinner', () => {
  it('renders a named status with the default loading label', () => {
    const wrapper = mount(GhostSpinner)
    const root = wrapper.get('.ghost-spinner')

    expect(root.element.tagName).toBe('SPAN')
    expect(root.attributes('role')).toBe('status')
    expect(root.attributes('data-part')).toBe('root')
    expect(root.classes()).toContain('ghost-spinner')
    expect(root.text()).toBe('Loading')
    expect(
      wrapper.get('.ghost-visually-hidden').attributes('aria-hidden'),
    ).toBe(undefined)
  })

  it('renders a custom label as visually hidden text', () => {
    const wrapper = mount(GhostSpinner, {
      props: { label: 'Refreshing reports' },
    })

    expect(wrapper.get('.ghost-spinner').text()).toBe('Refreshing reports')
    expect(wrapper.get('.ghost-visually-hidden').text()).toBe(
      'Refreshing reports',
    )
  })

  it('forwards native attributes and listeners to the status root', async () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostSpinner, {
      attrs: {
        id: 'table-pending',
        class: 'dense',
        'data-testid': 'refresh-spinner',
        onClick,
      },
    })

    const root = wrapper.get('.ghost-spinner')
    await root.trigger('click')

    expect(root.attributes('id')).toBe('table-pending')
    expect(root.attributes('data-testid')).toBe('refresh-spinner')
    expect(root.classes()).toContain('ghost-spinner')
    expect(root.classes()).toContain('dense')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('forwards aria-label without dropping live-region contents', () => {
    const wrapper = mount(GhostSpinner, {
      attrs: { 'aria-label': 'Table pending' },
    })
    const root = wrapper.get('.ghost-spinner')

    expect(root.attributes('aria-label')).toBe('Table pending')
    expect(root.text()).toBe('Loading')
  })

  it('forwards aria-labelledby without dropping live-region contents', () => {
    const wrapper = mount(GhostSpinner, {
      attrs: { 'aria-labelledby': 'reports-caption' },
    })

    expect(wrapper.get('.ghost-spinner').attributes('aria-labelledby')).toBe(
      'reports-caption',
    )
    expect(wrapper.get('.ghost-spinner').text()).toBe('Loading')
  })

  it('forwards aria-hidden so a parent region can own the announcement', () => {
    const wrapper = mount(GhostSpinner, {
      attrs: { 'aria-hidden': 'true' },
    })

    expect(wrapper.get('.ghost-spinner').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.ghost-visually-hidden').text()).toBe('Loading')
  })

  it('renders deterministic status markup during SSR', async () => {
    const html = await renderToString(h(GhostSpinner))

    expect(html).toContain('class="ghost-spinner"')
    expect(html).toContain('role="status"')
    expect(html).toContain('data-part="root"')
    expect(html).toContain('Loading')
    expect(html).toContain('ghost-visually-hidden')
    expect(html).not.toContain('aria-busy')
  })

  it('keeps live-region contents in SSR output when aria-label is also set', async () => {
    const html = await renderToString(
      h(GhostSpinner, { 'aria-label': 'Table pending' }),
    )

    expect(html).toContain('aria-label="Table pending"')
    expect(html).toContain('ghost-visually-hidden')
    expect(html).toContain('Loading')
  })
})
