import { expect, test, type Locator, type Page } from '@playwright/test'

import { startStaticServer } from './static-server'

function isTransparentColor(value: string): boolean {
  return /^(transparent|rgba\(\s*0,\s*0,\s*0,\s*0\s*\)|oklab\(\s*0\s+0\s+0\s*\/\s*0\s*\))$/i.test(
    value,
  )
}

async function assertNoPageOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return doc.scrollWidth - doc.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(0)
}

async function fieldChrome(locator: Locator): Promise<{
  borderTopWidth: string
  paddingBlockStart: string
  paddingInlineStart: string
  backgroundColor: string
}> {
  return locator.evaluate((element) => {
    const computed = getComputedStyle(element)
    return {
      borderTopWidth: computed.borderTopWidth,
      paddingBlockStart: computed.paddingBlockStart,
      paddingInlineStart: computed.paddingInlineStart,
      backgroundColor: computed.backgroundColor,
    }
  })
}

test.describe('docs revitalize phase 1', () => {
  const narrowWidths = [320, 375, 390, 768] as const

  for (const width of narrowWidths) {
    test(`no horizontal overflow at ${String(width)}px on input page`, async ({
      page,
    }) => {
      const docs = await startStaticServer('apps/docs/.vitepress/dist')
      try {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(`${docs.url}/components/input.html`)
        await assertNoPageOverflow(page)
        if (width < 768) {
          const menuButton = page.locator('.VPNavBarHamburger')
          await expect(menuButton).toBeVisible()
          const box = await menuButton.boundingBox()
          expect(box).not.toBeNull()
          if (box) {
            expect(box.x + box.width).toBeLessThanOrEqual(width + 1)
          }
        }
      } finally {
        await docs.close()
      }
    })
  }

  test('themed GhostInput and GhostTextarea keep border and padding', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/input.html`)
      const input = page
        .locator('[data-example-id="input/themed"]')
        .getByTestId('ghost-example-preview')
        .locator('.ghost-input')
        .first()
      await expect(input).toBeVisible()
      const inputStyles = await fieldChrome(input)
      expect(Number.parseFloat(inputStyles.paddingBlockStart)).toBeGreaterThan(0)
      expect(Number.parseFloat(inputStyles.paddingInlineStart)).toBeGreaterThan(0)
      expect(Number.parseFloat(inputStyles.borderTopWidth)).toBeGreaterThan(0)
      expect(isTransparentColor(inputStyles.backgroundColor)).toBe(false)

      await page.goto(`${docs.url}/components/textarea.html`)
      const textarea = page
        .locator('[data-example-id="textarea/themed"]')
        .getByTestId('ghost-example-preview')
        .locator('.ghost-textarea')
        .first()
      await expect(textarea).toBeVisible()
      const textareaStyles = await fieldChrome(textarea)
      expect(
        Number.parseFloat(textareaStyles.paddingBlockStart),
      ).toBeGreaterThan(0)
      expect(
        Number.parseFloat(textareaStyles.paddingInlineStart),
      ).toBeGreaterThan(0)
      expect(Number.parseFloat(textareaStyles.borderTopWidth)).toBeGreaterThan(0)
      expect(isTransparentColor(textareaStyles.backgroundColor)).toBe(false)
    } finally {
      await docs.close()
    }
  })

  test('headless checkbox indeterminate preview is not recipe-themed', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.goto(`${docs.url}/components/checkbox.html`)
      const checkbox = page
        .locator('[data-example-id="checkbox/indeterminate"]')
        .getByTestId('ghost-example-preview')
        .locator('.ghost-checkbox')
        .first()
      await expect(checkbox).toBeVisible()

      const mark = await checkbox.evaluate((element) => {
        const before = getComputedStyle(element, '::before')
        return {
          content: before.content,
          borderTopWidth: before.borderTopWidth,
          backgroundColor: before.backgroundColor,
        }
      })
      expect(mark.content === 'none' || mark.content === 'normal').toBe(true)
      expect(Number.parseFloat(mark.borderTopWidth)).toBe(0)
    } finally {
      await docs.close()
    }
  })

  test('@visual docs shell and fields at desktop and narrow widths', async ({
    page,
  }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      async function ensureAppearance(mode: 'light' | 'dark'): Promise<void> {
        await page.evaluate((next) => {
          localStorage.setItem('vitepress-theme-appearance', next)
        }, mode)
        await page.reload()
        await expect
          .poll(async () =>
            page.evaluate(() =>
              document.documentElement.classList.contains('dark')
                ? 'dark'
                : 'light',
            ),
          )
          .toBe(mode)
      }

      for (const [name, width] of [
        ['desktop', 1280],
        ['narrow', 390],
      ] as const) {
        await page.setViewportSize({ width, height: 800 })
        await page.goto(`${docs.url}/components/input.html`)
        for (const mode of ['light', 'dark'] as const) {
          await ensureAppearance(mode)
          await assertNoPageOverflow(page)
          const shell = page.locator('.VPNav')
          await expect(shell).toHaveScreenshot(
            `docs-revitalize-nav-${name}-${mode}.png`,
          )
          const inputPreview = page.locator('[data-example-id="input/themed"]')
          await expect(inputPreview).toHaveScreenshot(
            `docs-revitalize-input-themed-${name}-${mode}.png`,
          )
        }
      }
    } finally {
      await docs.close()
    }
  })

  test('open dialog overlay in docs stays within viewport', async ({ page }) => {
    const docs = await startStaticServer('apps/docs/.vitepress/dist')
    try {
      await page.setViewportSize({ width: 390, height: 800 })
      await page.goto(`${docs.url}/components/dialog.html`)
      const trigger = page
        .locator('[data-example-id="dialog/themed"]')
        .getByRole('button', { name: 'Edit profile' })
      await trigger.click()
      await expect(page.getByRole('dialog', { name: 'Profile details' })).toBeVisible()
      await assertNoPageOverflow(page)
    } finally {
      await docs.close()
    }
  })
})