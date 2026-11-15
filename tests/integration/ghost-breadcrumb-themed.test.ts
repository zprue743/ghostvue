import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import {
  GhostBreadcrumb,
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
})
