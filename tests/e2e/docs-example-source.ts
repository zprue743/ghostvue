import { expect, type Locator, type Page } from '@playwright/test'

/** The `Code` disclosure toggle that `GhostExample` renders for its source slot. */
export function exampleSourceToggle(page: Page, id: string): Locator {
  return page
    .locator(`[data-example-id="${id}"]`)
    .getByRole('button', { name: /source code$/ })
}

/** The highlighted VitePress fence inside an example's source region. */
export function exampleSourceBlock(page: Page, id: string): Locator {
  return page.locator(
    `[data-example-id="${id}"] [data-testid="ghost-example-source"] > div[class*="language-"]`,
  )
}

/**
 * Expand an example's collapsed source. Static pages are server-rendered, so a
 * click that lands before hydration is a no-op; retry until the toggle reports
 * the expanded state rather than sleeping.
 */
export async function openExampleSource(page: Page, id: string): Promise<void> {
  const toggle = exampleSourceToggle(page, id)
  await expect(async () => {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click()
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', {
      timeout: 500,
    })
  }).toPass()
}
