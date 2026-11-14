import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostBreadcrumb from '../../packages/vue/src/GhostBreadcrumb.vue'
import GhostBreadcrumbItem from '../../packages/vue/src/GhostBreadcrumbItem.vue'
import GhostBreadcrumbLink from '../../packages/vue/src/GhostBreadcrumbLink.vue'
import GhostBreadcrumbList from '../../packages/vue/src/GhostBreadcrumbList.vue'
import GhostBreadcrumbPage from '../../packages/vue/src/GhostBreadcrumbPage.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

function breadcrumbFixture() {
  return defineComponent({
    setup() {
      return () =>
        h(GhostBreadcrumb, { ariaLabel: 'SSR trail' }, () =>
          h(GhostBreadcrumbList, null, () => [
            h(GhostBreadcrumbItem, null, () =>
              h(GhostBreadcrumbLink, { href: '/' }, () => 'Home'),
            ),
            h(GhostBreadcrumbItem, null, () =>
              h(GhostBreadcrumbPage, null, () => 'Current'),
            ),
          ]),
        )
    },
  })
}

describe('GhostBreadcrumb SSR', () => {
  it('renders and hydrates landmark trail markup', async () => {
    await expectSsrHydration(breadcrumbFixture(), {
      assertServerHtml(html) {
        expect(html).toContain('aria-label="SSR trail"')
        expect(html).toContain('data-part="list"')
        expect(html).toContain('aria-current="page"')
        expect(html).toContain('Current')
      },
    })
  })
})
