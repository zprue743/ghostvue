import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('docs theme switcher', () => {
  test('dogfoods calm on first paint and persists a flagship choice', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(docs.url)
      const root = page.locator('html')
      await expect(root).toHaveClass(/slop-theme/)
      await expect(root).toHaveAttribute('data-sl-theme', 'calm')
      await expect(page.getByTestId('docs-theme-calm').first()).toHaveAttribute(
        'aria-checked',
        'true',
      )

      await page.getByTestId('docs-theme-vibrant').first().click()
      await expect(root).toHaveAttribute('data-sl-theme', 'vibrant')
      expect(
        await page.evaluate(() => localStorage.getItem('slop-docs-theme')),
      ).toBe('vibrant')

      await page.reload()
      await expect(root).toHaveAttribute('data-sl-theme', 'vibrant')
      await expect(
        page.getByTestId('docs-theme-vibrant').first(),
      ).toHaveAttribute('aria-checked', 'true')
    } finally {
      await docs.close()
    }
  })
})
