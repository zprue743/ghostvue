import { describe, expect, it } from 'vitest'

import GhostAvatar from '../../packages/vue/src/GhostAvatar.vue'
import { expectSsrHydration, ssrHydrationRoot } from '../support/ssr-hydration'

describe('GhostAvatar SSR hydration', () => {
  it('hydrates initials-only markup without warnings', async () => {
    await expectSsrHydration(
      ssrHydrationRoot(GhostAvatar, { name: 'Jane Doe' }),
      {
        assertServerHtml(html) {
          expect(html).toContain('JD')
          expect(html).not.toContain('data-state=')
        },
      },
    )
  })

  it('hydrates loading fallback when src is set without img in SSR HTML', async () => {
    await expectSsrHydration(
      ssrHydrationRoot(GhostAvatar, {
        src: 'https://example.com/photo.png',
        name: 'Jane Doe',
      }),
      {
        assertServerHtml(html) {
          expect(html).toContain('data-state="loading"')
          expect(html).not.toContain('<img')
        },
      },
    )
  })
})
