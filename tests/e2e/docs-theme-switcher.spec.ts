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
      await expect(root).toHaveClass(/ghost-theme/)
      await expect(root).toHaveAttribute('data-ghost-theme', 'calm')
      await expect(page.getByTestId('docs-theme-calm').first()).toHaveAttribute(
        'aria-checked',
        'true',
      )

      await page.getByTestId('docs-theme-vibrant').first().click()
      await expect(root).toHaveAttribute('data-ghost-theme', 'vibrant')
      expect(
        await page.evaluate(() => localStorage.getItem('ghost-docs-theme')),
      ).toBe('vibrant')

      await page.reload()
      await expect(root).toHaveAttribute('data-ghost-theme', 'vibrant')
      await expect(
        page.getByTestId('docs-theme-vibrant').first(),
      ).toHaveAttribute('aria-checked', 'true')
    } finally {
      await docs.close()
    }
  })

  test('appearance toggle stays responsive and syncs data-ghost-mode', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/button`)
      const root = page.locator('html')
      await expect(root).toHaveAttribute('data-ghost-mode', 'light')
      await page.evaluate(() => {
        const counter = window as unknown as { classWrites: number }
        counter.classWrites = 0
        new MutationObserver((records) => {
          counter.classWrites += records.length
        }).observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class'],
        })
      })
      const toggle = page.locator('.VPNavBar .VPSwitchAppearance').first()
      for (const mode of ['dark', 'light', 'dark', 'light']) {
        await toggle.click({ timeout: 2_000 })
        await expect(root).toHaveAttribute('data-ghost-mode', mode)
        await expect(root).toHaveClass(/ghost-theme/)
      }
      const writes = await page.evaluate(
        () => (window as unknown as { classWrites: number }).classWrites,
      )
      expect(writes).toBeLessThan(40)
    } finally {
      await docs.close()
    }
  })
})
