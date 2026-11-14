import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it, vi } from 'vitest'

import GhostProgress from './GhostProgress.vue'

describe('GhostProgress', () => {
  it('renders an indeterminate progressbar when value is omitted', () => {
    const wrapper = mount(GhostProgress, {
      props: { label: 'Preparing export' },
    })
    const root = wrapper.get('[role="progressbar"]')

    expect(root.element.tagName).toBe('DIV')
    expect(root.classes()).toContain('ghost-progress')
    expect(root.attributes('data-part')).toBe('root')
    expect(root.attributes('data-state')).toBe('indeterminate')
    expect(root.attributes('aria-label')).toBe('Preparing export')
    expect(root.attributes('aria-valuemin')).toBe('0')
    expect(root.attributes('aria-valuemax')).toBe('100')
    expect(root.attributes('aria-valuenow')).toBeUndefined()
    expect(root.attributes('aria-valuetext')).toBeUndefined()
    expect(root.get('[data-part="indicator"]').attributes('style')).toBeFalsy()
  })

  it('exposes determinate now/max and a default percent value text', () => {
    const wrapper = mount(GhostProgress, {
      props: { value: 40, label: 'Uploading report' },
    })
    const root = wrapper.get('[role="progressbar"]')
    const indicator = root.get('[data-part="indicator"]')

    expect(root.attributes('data-state')).toBeUndefined()
    expect(root.attributes('aria-valuenow')).toBe('40')
    expect(root.attributes('aria-valuetext')).toBe('40%')
    expect(indicator.element.getAttribute('style')).toContain('40%')
  })

  it('uses custom value text when provided', () => {
    const wrapper = mount(GhostProgress, {
      props: {
        value: 3,
        max: 10,
        label: 'Uploading files',
        valueText: '3 of 10 files',
      },
    })
    const root = wrapper.get('[role="progressbar"]')

    expect(root.attributes('aria-valuenow')).toBe('3')
    expect(root.attributes('aria-valuemax')).toBe('10')
    expect(root.attributes('aria-valuetext')).toBe('3 of 10 files')
  })

  it('forwards native attributes and listeners to the progressbar root', async () => {
    const onClick = vi.fn()
    const wrapper = mount(GhostProgress, {
      props: { value: 10, label: 'Export' },
      attrs: {
        id: 'invoice-upload',
        class: 'dense',
        'aria-labelledby': 'export-heading',
        'data-testid': 'export-progress',
        onClick,
      },
    })
    const root = wrapper.get('[role="progressbar"]')
    await root.trigger('click')

    expect(root.attributes('id')).toBe('invoice-upload')
    expect(root.attributes('aria-labelledby')).toBe('export-heading')
    expect(root.attributes('data-testid')).toBe('export-progress')
    expect(root.classes()).toContain('ghost-progress')
    expect(root.classes()).toContain('dense')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('clamps overflow and treats non-finite value as indeterminate', async () => {
    const wrapper = mount(GhostProgress, {
      props: { value: 150, max: 100, label: 'Export' },
    })
    const root = wrapper.get('[role="progressbar"]')

    expect(root.attributes('aria-valuenow')).toBe('100')
    expect(root.attributes('aria-valuetext')).toBe('100%')

    await wrapper.setProps({ value: Number.NaN })
    expect(root.attributes('data-state')).toBe('indeterminate')
    expect(root.attributes('aria-valuenow')).toBeUndefined()
  })

  it('renders deterministic markup during SSR', async () => {
    const html = await renderToString(
      h(GhostProgress, { value: 25, label: 'Generating PDF' }),
    )

    expect(html).toContain('class="ghost-progress"')
    expect(html).toContain('role="progressbar"')
    expect(html).toContain('data-part="root"')
    expect(html).toContain('data-part="indicator"')
    expect(html).toContain('aria-valuenow="25"')
    expect(html).toContain('aria-valuetext="25%"')
    expect(html).toContain('aria-label="Generating PDF"')
    expect(html).not.toContain('data-state')
  })

  it('omits value attributes from SSR output while indeterminate', async () => {
    const html = await renderToString(
      h(GhostProgress, { label: 'Preparing export' }),
    )

    expect(html).toContain('data-state="indeterminate"')
    expect(html).toContain('aria-valuemax="100"')
    expect(html).not.toContain('aria-valuenow')
    expect(html).not.toContain('aria-valuetext')
  })
})
