import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { describe, expect, it } from 'vitest'

import {
  GhostBreadcrumb,
  GhostBreadcrumbEllipsis,
  GhostBreadcrumbItem,
  GhostBreadcrumbLink,
  GhostBreadcrumbList,
  GhostBreadcrumbPage,
  GhostBreadcrumbSeparator,
} from '../../packages/themes/src/index'

const css = readFileSync(
  join(import.meta.dirname, '../../packages/themes/src/ghost-breadcrumb.css'),
  'utf8',
)

describe('themed GhostBreadcrumb', () => {
  it('applies data-themed on list and link parts', () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(GhostBreadcrumb, { ariaLabel: 'Trail' }, () =>
            h(GhostBreadcrumbList, null, () =>
              h(GhostBreadcrumbItem, null, () => [
                h(GhostBreadcrumbLink, { href: '/' }, () => 'Home'),
                h(GhostBreadcrumbSeparator),
                h(GhostBreadcrumbPage, null, () => 'Here'),
              ]),
            ),
          ),
      }),
    )

    expect(wrapper.get('[data-part="list"]').attributes('data-themed')).toBe('')
    expect(wrapper.get('[data-part="link"]').attributes('data-themed')).toBe('')
  })

  it('styles breadcrumb parts with --ghost-* tokens only', () => {
    expect(css).toMatch(/--ghost-/)
    expect(css).not.toMatch(/#[0-9a-f]{3,8}/i)
    expect(css).toContain('.ghost-breadcrumb-link')
    expect(css).toContain('.ghost-breadcrumb-page')
  })

  it('themes the ellipsis trigger and its body-portaled menu (GHO-223)', async () => {
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(GhostBreadcrumb, { ariaLabel: 'Trail' }, () =>
            h(GhostBreadcrumbList, null, () => [
              h(GhostBreadcrumbItem, null, () =>
                h(GhostBreadcrumbEllipsis, { label: 'Show parents' }, () => [
                  h(GhostBreadcrumbLink, { href: '#a' }, () => 'A'),
                  h(GhostBreadcrumbLink, { href: '#b' }, () => 'B'),
                ]),
              ),
              h(GhostBreadcrumbItem, null, () =>
                h(GhostBreadcrumbPage, null, () => 'Here'),
              ),
            ]),
          ),
      }),
      { attachTo: document.body },
    )

    try {
      const trigger = wrapper.get('button[aria-label="Show parents"]')
      expect(trigger.classes()).toContain('ghost-breadcrumb-ellipsis')
      expect(trigger.attributes('data-themed')).toBe('')
      // Closed: collapsed links are not rendered anywhere.
      expect(document.body.querySelector('a[href="#a"]')).toBeNull()
      expect(wrapper.get('[aria-current="page"]').text()).toBe('Here')

      await trigger.trigger('click')
      await nextTick()
      const content = document.body.querySelector(
        '.ghost-breadcrumb-ellipsis-content',
      )
      expect(content?.parentElement).toBe(document.body)
      // `data-themed` on the popover content picks up the opaque, layered
      // ghost-popover.css surface without a `.ghost-theme` ancestor.
      expect(content?.classList.contains('ghost-popover-content')).toBe(true)
      expect(content?.hasAttribute('data-themed')).toBe(true)
      expect(content?.querySelectorAll('a[data-themed]')).toHaveLength(2)
    } finally {
      wrapper.unmount()
    }
  })

  it('targets the ellipsis trigger itself rather than a nested button', () => {
    expect(css).toContain('.ghost-breadcrumb-ellipsis[data-themed]')
    expect(css).not.toMatch(
      /\.ghost-breadcrumb-ellipsis(\[data-themed\])?\s+button/,
    )
    expect(css).toContain('.ghost-breadcrumb-ellipsis-content[data-themed]')
  })
})
