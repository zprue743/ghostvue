import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

import { startStaticServer } from '../e2e/static-server'

interface PlaygroundFixtures {
  /**
   * Base URL for the built playground static host. The fixture owns server
   * lifecycle so specs do not repeat try/finally boilerplate.
   */
  playgroundUrl: string
}

export const playgroundTest = base.extend<PlaygroundFixtures>({
  // Fixture has no upstream dependencies; the empty destructure is intentional.
  // eslint-disable-next-line no-empty-pattern -- Playwright fixture with no deps
  playgroundUrl: async ({}, use) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await use(playground.url)
    } finally {
      await playground.close()
    }
  },
})

/** Navigates to the composite playground home used by component section tests. */
export async function gotoPlayground(
  page: Page,
  playgroundUrl: string,
): Promise<void> {
  await page.goto(playgroundUrl)
}

export { expect }
