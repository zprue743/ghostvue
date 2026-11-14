import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('docs landing page', () => {
  test('home GhostLanding passes axe', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/index.html`)
      await expect(page.locator('.ghost-landing')).toBeVisible()

      const axe = await new AxeBuilder({ page })
        .include('.ghost-landing')
        .analyze()
      expect(axe.violations).toEqual([])
    } finally {
      await docs.close()
    }
  })

  test('progression GhostTabs exposes tabpanel and arrow keys move focus', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/index.html`)
      const progression = page.locator('#progression')
      await expect(progression).toBeVisible()

      const list = progression.getByRole('tablist', {
        name: 'Progressive escape hatch examples',
      })
      const triggers = list.getByRole('tab')
      await expect(triggers).toHaveCount(4)

      const panels = progression.getByRole('tabpanel')
      await expect(panels).toHaveCount(1)

      await triggers.first().focus()
      await page.keyboard.press('ArrowDown')
      await expect(triggers.nth(1)).toBeFocused()
    } finally {
      await docs.close()
    }
  })
})
