import { expect, test } from '@playwright/test'

import { startStaticServer } from './static-server'

function isTransparentColor(value: string): boolean {
  return /^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|oklab\(\s*0\s+0\s+0\s*\/\s*0\s*\))$/i.test(
    value,
  )
}

test.describe('docs example previews', () => {
  test('themed button has recipe chrome and highlighted source', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/button.html`)

      const preview = page.locator('[data-example-id="button/themed"]')
      const button = preview
        .getByTestId('ghost-example-preview')
        .locator('.ghost-button')
      await expect(button).toBeVisible()

      const styles = await button.evaluate((element) => {
        const computed = getComputedStyle(element)
        return {
          borderTopColor: computed.borderTopColor,
          borderTopWidth: computed.borderTopWidth,
          paddingBlockStart: computed.paddingBlockStart,
          paddingInlineStart: computed.paddingInlineStart,
        }
      })

      expect(Number.parseFloat(styles.paddingBlockStart)).toBeGreaterThan(0)
      expect(Number.parseFloat(styles.paddingInlineStart)).toBeGreaterThan(0)
      expect(Number.parseFloat(styles.borderTopWidth)).toBeGreaterThan(0)
      expect(isTransparentColor(styles.borderTopColor)).toBe(false)

      const source = page.locator(
        '[data-example-id="button/themed"] + div[class*="language-"]',
      )
      await expect(
        source.locator('.vp-code span[style*="--shiki-"]').first(),
      ).toBeVisible()
      await expect(
        preview.getByRole('button', { name: 'Copy Themed source' }),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })

  test('headless preview states that the unstyled look is intentional', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/button.html`)

      const preview = page.locator('[data-example-id="button/basic"]')
      await expect(preview.getByText('Unstyled. Headless.')).toBeVisible()
      await expect(
        preview.getByTestId('ghost-example-preview').locator('.ghost-button'),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })
})
