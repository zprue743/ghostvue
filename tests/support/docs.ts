import { expect } from '@playwright/test'

import { startStaticServer } from '../e2e/static-server'

import { playgroundTest } from './playground'

interface DocsWorkerFixtures {
  /**
   * Base URL for the built VitePress docs static host. Worker-scoped so tests
   * share one HTTP server and warm browser caches across navigations.
   */
  docsUrl: string
}

/**
 * Extends `playgroundTest` so specs needing `docsUrl` (and optionally
 * `playgroundUrl`) share worker-scoped static servers lazily on demand.
 */
export const docsTest = playgroundTest.extend<object, DocsWorkerFixtures>({
  docsUrl: [
    // Fixture has no upstream dependencies; the empty destructure is intentional.
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
    async ({}, use) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await use(docs.url)
      } finally {
        await docs.close()
      }
    },
    { scope: 'worker' },
  ],
})

export { expect }
