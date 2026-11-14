import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostLink', () => {
  test('external example passes axe and exposes rel defaults', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=link/external`)
      const link = page.getByRole('link', { name: /WAI-ARIA link pattern/i })
      await expect(link).toBeVisible()
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      await expect(link.locator('[data-part="external-icon"]')).toBeVisible()

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('disabled example is not focusable', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=link/disabled`)
      const link = page.getByText('Unavailable destination')
      await expect(link).toHaveAttribute('aria-disabled', 'true')
      await expect(link).not.toHaveAttribute('href')
      await expect(link).toHaveAttribute('tabindex', '-1')
      await page.keyboard.press('Tab')
      await expect(link).not.toBeFocused()
    } finally {
      await playground.close()
    }
  })

  test('basic example supports keyboard focus', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')
    try {
      await page.goto(`${playground.url}/examples.html?id=link/basic`)
      const link = page.getByRole('link', { name: 'GhostButton docs' })
      await link.focus()
      await expect(link).toBeFocused()
    } finally {
      await playground.close()
    }
  })
})
