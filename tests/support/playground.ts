import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { startStaticServer } from '../e2e/static-server'

interface PlaygroundWorkerFixtures {
  /**
   * Base URL for the built playground static host. Worker-scoped so all
   * tests in a worker share one HTTP server and keep browser caches warm.
   */
  playgroundUrl: string
}

export const playgroundTest = base.extend<object, PlaygroundWorkerFixtures>({
  playgroundUrl: [
    // Fixture has no upstream dependencies; the empty destructure is intentional.
    // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
    async ({}, use) => {
      const playground = await startStaticServer('apps/playground/dist')
      try {
        await use(playground.url)
      } finally {
        await playground.close()
      }
    },
    { scope: 'worker' },
  ],
})

/** Navigates to the composite playground home used by component section tests. */
export async function gotoPlayground(
  page: Page,
  playgroundUrl: string,
): Promise<void> {
  await page.goto(playgroundUrl)
}

export { expect }
