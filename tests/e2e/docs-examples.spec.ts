import AxeBuilder from '@axe-core/playwright'
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

  test('popover docs demos open/close interactively in production build and pass Axe', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')

    try {
      await page.goto(`${docs.url}/components/popover.html`)

      const basicExample = page.locator('[data-example-id="popover/basic"]')
      await expect(basicExample.getByText('Unstyled. Headless.')).toBeVisible()

      const basicTrigger = basicExample.getByRole('button', {
        name: 'Toggle details',
      })
      await basicTrigger.click()
      const basicDialog = page.getByRole('dialog', { name: 'Toggle details' })
      await expect(basicDialog).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(basicDialog).toHaveCount(0)

      const themedExample = page.locator('[data-example-id="popover/themed"]')
      const themedTrigger = themedExample.getByRole('button', {
        name: 'Share settings',
      })
      await themedTrigger.click()

      const themedDialog = page.getByRole('dialog', {
        name: 'Share settings',
      })
      await expect(themedDialog).toBeVisible()

      const themedStyles = await themedDialog.evaluate((el) => {
        const computed = getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          borderTopWidth: computed.borderTopWidth,
          borderRadius: computed.borderRadius,
          boxShadow: computed.boxShadow,
        }
      })

      expect(isTransparentColor(themedStyles.backgroundColor)).toBe(false)
      expect(Number.parseFloat(themedStyles.borderTopWidth)).toBeGreaterThan(0)
      expect(Number.parseFloat(themedStyles.borderRadius)).toBeGreaterThan(0)
      expect(themedStyles.boxShadow).not.toBe('none')

      const openDocsAxe = await new AxeBuilder({ page }).analyze()
      expect(openDocsAxe.violations).toEqual([])

      await themedDialog.getByRole('button', { name: 'Done' }).click()
      await expect(themedDialog).toHaveCount(0)

      const source = page.locator(
        '[data-example-id="popover/themed"] + div[class*="language-"]',
      )
      await expect(
        source.locator('.vp-code span[style*="--shiki-"]').first(),
      ).toBeVisible()
    } finally {
      await docs.close()
    }
  })
})
