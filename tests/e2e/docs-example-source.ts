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

/** The `Width` disclosure toggle that `DemoPreview` renders in every toolbar. */
export function examplePreviewWidthToggle(page: Page, id: string): Locator {
  return page
    .locator(`[data-example-id="${id}"]`)
    .getByRole('button', { name: /preview width$/ })
}

/** Expand an example's Preview width band, retrying until hydration. */
export async function openPreviewWidth(page: Page, id: string): Promise<void> {
  const toggle = examplePreviewWidthToggle(page, id)
  await expect(async () => {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click()
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true', {
      timeout: 500,
    })
  }).toPass()
}

/**
 * Replace the Clipboard API with one whose writes settle as scripted, in call
 * order: each outcome says how long the write takes and whether it is denied
 * (`NotAllowedError`, as after a refused permission prompt). Calls beyond the
 * script succeed at once. Lets a test settle an older write after a newer one.
 */
export async function scriptClipboardWrites(
  page: Page,
  outcomes: readonly { delay: number; ok: boolean }[],
): Promise<void> {
  await page.addInitScript((script) => {
    const pending = [...script]
    const clipboard = {
      writeText: () => {
        const next = pending.shift() ?? { delay: 0, ok: true }
        return new Promise<void>((resolve, reject) => {
          setTimeout(() => {
            if (next.ok) resolve()
            else reject(new DOMException('Denied', 'NotAllowedError'))
          }, next.delay)
        })
      },
    }
    Object.defineProperty(Navigator.prototype, 'clipboard', {
      configurable: true,
      get: () => clipboard,
    })
  }, outcomes)
}
