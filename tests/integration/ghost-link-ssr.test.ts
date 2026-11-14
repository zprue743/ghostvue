import { h } from 'vue'
import { describe, expect, it } from 'vitest'

import GhostLink from '../../packages/vue/src/GhostLink.vue'
import { expectSsrHydration } from '../support/ssr-hydration'

describe('GhostLink SSR hydration', () => {
  it('hydrates external new-tab markup without mismatch', async () => {
    await expectSsrHydration(
      h(
        GhostLink,
        {
          href: 'https://example.com',
          target: '_blank',
        },
        () => 'Example',
      ),
      {
        assertServerHtml(html) {
          expect(html).toContain('rel="noopener noreferrer"')
          expect(html).toContain('data-part="external-icon"')
          expect(html).toContain('Opens in new tab')
        },
      },
    )
  })
})
