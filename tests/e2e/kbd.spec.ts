import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

test.describe('GhostKbd', () => {
  test('combination example exposes native kbd text', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=kbd/combination`)

      const preview = page.getByTestId('ghost-example-preview')
      await expect(preview).toBeVisible()

      const kbd = preview.locator('kbd.ghost-kbd')
      await expect(kbd).toBeVisible()
      await expect(kbd).toHaveAttribute('data-part', 'root')
      await expect(kbd).toContainText('Ctrl')
      await expect(kbd).toContainText('K')
      await expect(kbd.locator('[data-part="key"]')).toHaveCount(1)
      await expect(kbd.locator('[data-part="separator"]')).toHaveCount(1)

      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations).toEqual([])
    } finally {
      await playground.close()
    }
  })

  test('explicit platform example shows Apple and PC labels together', async ({
    page,
  }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=kbd/platform`)

      const preview = page.getByTestId('ghost-example-preview')
      await expect(preview.getByText('⌘', { exact: false })).toBeVisible()
      await expect(preview.getByText('Ctrl', { exact: false })).toBeVisible()
    } finally {
      await playground.close()
    }
  })

  test('themed keycaps have recipe chrome', async ({ page }) => {
    const playground = await startStaticServer('apps/playground/dist')

    try {
      await page.goto(`${playground.url}/examples.html?id=kbd/themed`)

      const key = page
        .getByTestId('ghost-example-preview')
        .locator('kbd[data-part="key"]')
        .first()
      await expect(key).toBeVisible()

      const styles = await key.evaluate((element) => {
        const computed = getComputedStyle(element)
        return {
          backgroundColor: computed.backgroundColor,
          borderTopWidth: computed.borderTopWidth,
          paddingInlineStart: computed.paddingInlineStart,
        }
      })

      expect(styles.backgroundColor).not.toMatch(/rgba?\(\s*0,\s*0,\s*0,\s*0/)
      expect(Number.parseFloat(styles.borderTopWidth)).toBeGreaterThan(0)
      expect(Number.parseFloat(styles.paddingInlineStart)).toBeGreaterThan(0)
    } finally {
      await playground.close()
    }
  })
})
