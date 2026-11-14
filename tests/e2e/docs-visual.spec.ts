import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

const modes = ['light', 'dark'] as const

const screenshotOptions = {
  animations: 'disabled' as const,
  maxDiffPixelRatio: 0.03,
}

async function ensureDocsAppearance(page: Page, mode: (typeof modes)[number]) {
  await page.evaluate((next) => {
    localStorage.setItem('vitepress-theme-appearance', next)
  }, mode)
  await page.reload()
  await expect
    .poll(async () =>
      page.evaluate(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      ),
    )
    .toBe(mode)
  await page.evaluate(async () => {
    await document.fonts.ready
  })
}

test.describe('docs visual baselines', { tag: '@visual' }, () => {
  test.use({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 1,
  })

  for (const mode of modes) {
    test(`docs chrome nav at 390px (${mode})`, async ({ page }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`${docs.url}/components/input.html`)
        await ensureDocsAppearance(page, mode)
        await page.evaluate(() => {
          window.scrollTo(0, 0)
        })
        const nav = page.locator('.VPNav')
        await expect(nav).toBeVisible()
        await expect(nav).toHaveScreenshot(
          `docs-nav-390-${mode}.png`,
          screenshotOptions,
        )
      } finally {
        await docs.close()
      }
    })

    test(`docs input themed preview at 390px (${mode})`, async ({ page }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`${docs.url}/components/input.html`)
        await ensureDocsAppearance(page, mode)
        const preview = page
          .locator('[data-example-id="input/themed"]')
          .getByTestId('ghost-example-preview')
        await preview.scrollIntoViewIfNeeded()
        await expect(preview).toBeVisible()
        await expect(
          preview.locator('.ghost-input').first(),
        ).toBeAttached()
        await preview.evaluate((element) => {
          element.style.padding = '12px'
        })
        await expect(preview).toHaveScreenshot(
          `docs-input-themed-390-${mode}.png`,
          screenshotOptions,
        )
      } finally {
        await docs.close()
      }
    })

    test(`docs checkbox headless preview at 390px (${mode})`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await page.goto(`${docs.url}/components/checkbox.html`)
        await ensureDocsAppearance(page, mode)
        const preview = page
          .locator('[data-example-id="checkbox/indeterminate"]')
          .getByTestId('ghost-example-preview')
        await preview.scrollIntoViewIfNeeded()
        await expect(preview).toBeVisible()
        await expect(
          preview.locator('.ghost-checkbox').first(),
        ).toBeAttached()
        await preview.evaluate((element) => {
          element.style.padding = '12px'
        })
        await expect(preview).toHaveScreenshot(
          `docs-checkbox-headless-390-${mode}.png`,
          screenshotOptions,
        )
      } finally {
        await docs.close()
      }
    })
  }
})