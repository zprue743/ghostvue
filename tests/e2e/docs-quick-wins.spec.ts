import { expect, test, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

async function assertNoPageOverflow(page: Page): Promise<void> {
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  if (!viewport) return

  const scrollDelta = await page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth
  })

  expect(scrollDelta).toBeLessThanOrEqual(1)
}

test.describe('docs quick wins', () => {
  test('local search opens with Ctrl+K and skips internal pages', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      const indexResponse = page.waitForResponse((response) =>
        response.url().includes('localSearchIndex'),
      )
      await page.goto(`${docs.url}/components/button.html`)
      const dialog = page.locator('.VPLocalSearchBox')
      await page.locator('body').click()
      await page.evaluate(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'k',
            ctrlKey: true,
            bubbles: true,
          }),
        )
      })
      await expect(dialog).toBeVisible()
      const indexBody = await (await indexResponse).text()
      const query = page.locator('#localsearch-input')
      await query.fill('GhostButton')
      await expect(page.locator('.result .title').first()).toContainText(
        /GhostButton/i,
      )

      const indexText = indexBody
      expect(indexText).not.toMatch(/components\/button-spec\.md/)
      expect(indexText).not.toMatch(/standards\/code-style\.md/)
      expect(indexText).not.toMatch(/agents\/AGENT_GUIDE\.md/)
    } finally {
      await docs.close()
    }
  })

  test('navbar brand is fully visible at 390px', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 390, height: 800 })
      await page.goto(`${docs.url}/components/button.html`)
      const brand = page.locator('.VPNavBarTitle .title')
      await expect(brand).toBeVisible()
      const metrics = await brand.evaluate((element) => {
        const label = element.textContent.trim()
        return {
          label,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        }
      })
      expect(metrics.label).toBe('GhostVue')
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1)
    } finally {
      await docs.close()
    }
  })

  test('homepage has no horizontal overflow at 390px', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 390, height: 800 })
      await page.goto(`${docs.url}/index.html`)
      await expect(page.locator('.ghost-landing')).toBeVisible()
      await assertNoPageOverflow(page)
    } finally {
      await docs.close()
    }
  })

  test('homepage hides the docs sidebar', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto(`${docs.url}/index.html`)
      await expect(page.locator('.ghost-landing')).toBeVisible()
      await expect(page.locator('.VPSidebar')).toHaveCount(0)
    } finally {
      await docs.close()
    }
  })
})
