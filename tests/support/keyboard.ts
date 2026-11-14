import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Asserts that the locator receives keyboard focus. Prefer this over scattered
 * `toBeFocused` calls so focus regressions read consistently in e2e output.
 */
export async function expectFocus(locator: Locator): Promise<void> {
  await expect(locator).toBeFocused()
}

/**
 * Dispatches a key sequence in order. Modifiers use Playwright names such as
 * `Shift+Tab` rather than holding keys separately.
 */
export async function pressSequence(
  page: Page,
  keys: readonly string[],
): Promise<void> {
  for (const key of keys) {
    await page.keyboard.press(key)
  }
}
